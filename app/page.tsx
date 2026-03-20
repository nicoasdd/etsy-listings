"use client";

import { Suspense, useState, useCallback, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import ConnectionStatus from "@/app/components/ConnectionStatus";
import ChatGPTStatus from "@/app/components/ChatGPTStatus";
import TestPrompt from "@/app/components/TestPrompt";
import ListingGenerator from "@/app/components/ListingGenerator";
import JsonEditor from "@/app/components/JsonEditor";
import UploadResults from "@/app/components/UploadResults";
import type { UploadResponse, UploadResult } from "@/lib/types/app";

function HomeContent() {
  const searchParams = useSearchParams();
  const [rawJson, setRawJson] = useState("");
  const [isValidJson, setIsValidJson] = useState(false);
  const [isArray, setIsArray] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResponse, setUploadResponse] = useState<UploadResponse | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isChatGPTConnected, setIsChatGPTConnected] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | undefined>();
  const [streamedResults, setStreamedResults] = useState<UploadResult[]>([]);
  const [pageError, setPageError] = useState<string | null>(null);

  useEffect(() => {
    const error = searchParams.get("error");
    if (error) {
      setPageError(error);
      window.history.replaceState({}, "", "/");
    }
  }, [searchParams]);

  const handleStatusChange = useCallback((connected: boolean) => {
    setIsConnected(connected);
  }, []);

  const handleChatGPTStatusChange = useCallback((connected: boolean) => {
    setIsChatGPTConnected(connected);
  }, []);

  const handleJsonChange = useCallback(
    (raw: string, valid: boolean, array: boolean) => {
      setRawJson(raw);
      setIsValidJson(valid);
      setIsArray(array);
      setUploadResponse(null);
      setUploadError(null);
    },
    []
  );

  const uploadStreaming = async () => {
    setStreamedResults([]);
    setUploadProgress(undefined);

    const res = await fetch("/api/listings/upload", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
      },
      body: rawJson,
    });

    if (!res.ok) {
      const data = await res.json();
      throw data;
    }

    const reader = res.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      let eventType = "";
      for (const line of lines) {
        if (line.startsWith("event: ")) {
          eventType = line.slice(7).trim();
        } else if (line.startsWith("data: ")) {
          const data = JSON.parse(line.slice(6));
          if (eventType === "total") {
            setUploadProgress({ current: 0, total: data.total });
          } else if (eventType === "result") {
            setStreamedResults((prev) => [...prev, data as UploadResult]);
            setUploadProgress((prev) =>
              prev ? { ...prev, current: prev.current + 1 } : undefined
            );
          } else if (eventType === "done") {
            setUploadResponse(data as UploadResponse);
          }
        }
      }
    }
  };

  const uploadStandard = async () => {
    const res = await fetch("/api/listings/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: rawJson,
    });

    const data = await res.json();

    if (!res.ok) {
      throw data;
    }

    setUploadResponse(data as UploadResponse);
  };

  const handleUpload = async () => {
    if (!isValidJson || !rawJson.trim()) return;

    setIsUploading(true);
    setUploadResponse(null);
    setUploadError(null);
    setStreamedResults([]);
    setUploadProgress(undefined);

    try {
      if (isArray) {
        await uploadStreaming();
      } else {
        await uploadStandard();
      }
    } catch (err: unknown) {
      const errorObj = err as Record<string, unknown>;
      if (errorObj?.validation_errors) {
        const validationErrors = errorObj.validation_errors as Array<{
          index: number;
          title: string;
          errors: string[];
        }>;
        const errorMessages = validationErrors
          .map(
            (ve) =>
              `Listing ${ve.index + 1} (${ve.title}): ${ve.errors.join(", ")}`
          )
          .join("\n");
        setUploadError(errorMessages);
      } else if (errorObj?.error) {
        setUploadError(String(errorObj.error));
        if (errorObj.needs_reauth) {
          setIsConnected(false);
        }
      } else if (err instanceof Error) {
        setUploadError(err.message);
      } else {
        setUploadError("An unexpected error occurred");
      }
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      {pageError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="flex items-start justify-between">
            <p className="text-sm text-red-700">{pageError}</p>
            <button
              onClick={() => setPageError(null)}
              className="ml-4 shrink-0 text-red-400 hover:text-red-600"
              aria-label="Dismiss"
            >
              <svg className="h-4 w-4" viewBox="0 0 16 16" fill="currentColor">
                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z" />
              </svg>
            </button>
          </div>
        </div>
      )}

      <ConnectionStatus onStatusChange={handleStatusChange} />

      <ChatGPTStatus onStatusChange={handleChatGPTStatusChange} />

      {isChatGPTConnected && <TestPrompt />}

      {isChatGPTConnected && (
        <ListingGenerator isEtsyConnected={isConnected} />
      )}

      {isConnected && (
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <h2 className="text-lg font-semibold text-gray-900">
            Upload Listings
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            Paste a JSON object for a single listing, or a JSON array for
            batch upload.
          </p>

          <div className="mt-4 space-y-4">
            <JsonEditor onJsonChange={handleJsonChange} />

            <button
              onClick={handleUpload}
              disabled={!isValidJson || isUploading}
              className="w-full rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isUploading
                ? "Uploading..."
                : isArray
                  ? "Upload Listings"
                  : "Upload Listing"}
            </button>

            {uploadError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                <p className="whitespace-pre-wrap text-sm text-red-700">
                  {uploadError}
                </p>
              </div>
            )}

            <UploadResults
              response={uploadResponse}
              isUploading={isUploading}
              uploadProgress={uploadProgress}
              streamedResults={streamedResults}
            />
          </div>
        </div>
      )}
    </>
  );
}

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-3xl font-bold tracking-tight">
        Etsy Craft Listing Uploader
      </h1>
      <p className="mt-2 text-gray-600">
        Connect your Etsy shop and upload craft listings via JSON.
      </p>

      <div className="mt-8 space-y-6">
        <Suspense
          fallback={
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="animate-pulse text-gray-400">Loading...</div>
            </div>
          }
        >
          <HomeContent />
        </Suspense>
      </div>
    </main>
  );
}
