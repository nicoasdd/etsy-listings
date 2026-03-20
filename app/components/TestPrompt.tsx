"use client";

import { useState } from "react";
import type { TestPromptResponse } from "@/lib/types/chatgpt";

const DEFAULT_TEST_MESSAGE =
  "Hello! Please confirm you're working by responding with a brief greeting.";

export default function TestPrompt() {
  const [customMessage, setCustomMessage] = useState("");
  const [response, setResponse] = useState<TestPromptResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendPrompt = async (message: string) => {
    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await fetch("/api/chatgpt/test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "An error occurred while contacting ChatGPT.");
        return;
      }

      setResponse(data as TestPromptResponse);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTestConnection = () => sendPrompt(DEFAULT_TEST_MESSAGE);

  const handleSendCustom = () => {
    if (customMessage.trim()) {
      sendPrompt(customMessage.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && customMessage.trim() && !loading) {
      handleSendCustom();
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Test ChatGPT Connection
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Send a test prompt to verify ChatGPT is working.
      </p>

      <div className="mt-4 space-y-3">
        <button
          onClick={handleTestConnection}
          disabled={loading}
          className="rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? "Waiting for ChatGPT..." : "Test Connection"}
        </button>

        <div className="flex gap-2">
          <input
            type="text"
            value={customMessage}
            onChange={(e) => setCustomMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Or type a custom message..."
            maxLength={2000}
            disabled={loading}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:opacity-50"
          />
          <button
            onClick={handleSendCustom}
            disabled={loading || !customMessage.trim()}
            className="rounded-lg border border-purple-600 px-4 py-2 text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50 disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>

      {loading && (
        <div className="mt-4 flex items-center gap-2">
          <svg
            className="h-4 w-4 animate-spin text-purple-600"
            viewBox="0 0 24 24"
            fill="none"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-sm text-gray-500">Waiting for ChatGPT...</span>
        </div>
      )}

      {response?.success && (
        <div className="mt-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
          <div className="mb-1 text-xs font-medium text-purple-600">
            ChatGPT ({response.model})
          </div>
          <p className="whitespace-pre-wrap text-sm text-gray-800">
            {response.response}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm text-red-700">{error}</p>
          <button
            onClick={handleTestConnection}
            className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
