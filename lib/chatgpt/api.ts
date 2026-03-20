const CODEX_RESPONSES_URL = "https://chatgpt.com/backend-api/codex/responses";
const REQUEST_TIMEOUT_MS = 30_000;
const DEFAULT_MODEL = "gpt-5.4";

export async function sendChatGPTPrompt(
  accessToken: string,
  message: string,
  model?: string
): Promise<{ response: string; model: string }> {
  const selectedModel = model || DEFAULT_MODEL;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const res = await fetch(CODEX_RESPONSES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        model: selectedModel,
        instructions: "You are a helpful assistant.",
        store: false,
        stream: true,
        input: [
          {
            role: "user",
            content: [{ type: "input_text", text: message }],
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!res.ok) {
      const errorBody = await res.text();
      throw new Error(`ChatGPT request failed (${res.status}): ${errorBody}`);
    }

    const assembled = await collectStreamedResponse(res);
    return { response: assembled, model: selectedModel };
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error("TIMEOUT");
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

async function collectStreamedResponse(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) {
    const json = await res.json();
    return extractTextFromResponse(json);
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let deltaText = "";
  let completedText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") break;

      try {
        const event = JSON.parse(payload) as Record<string, unknown>;

        if (event.type === "response.output_text.delta") {
          deltaText += event.delta as string;
        } else if (event.type === "response.completed" || event.type === "response.done") {
          const output = event.response as Record<string, unknown> | undefined;
          if (output?.output) {
            completedText = extractTextFromResponseOutput(output.output as unknown[]);
          }
        }
      } catch {
        // skip malformed SSE chunks
      }
    }
  }

  return deltaText || completedText || "(No response received)";
}

function extractTextFromResponse(json: Record<string, unknown>): string {
  if (json.output) {
    return extractTextFromResponseOutput(json.output as unknown[]);
  }
  return JSON.stringify(json);
}

function extractTextFromResponseOutput(output: unknown[]): string {
  let text = "";
  for (const item of output) {
    const entry = item as Record<string, unknown>;
    if (entry.type === "message" && Array.isArray(entry.content)) {
      for (const part of entry.content as Record<string, unknown>[]) {
        if (part.type === "output_text" && typeof part.text === "string") {
          text += part.text;
        }
      }
    }
  }
  return text || "(No text in response)";
}
