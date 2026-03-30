"use client";

import type { UploadResponse, UploadResult } from "@/lib/types/app";

interface UploadResultsProps {
  response: UploadResponse | null;
  isUploading: boolean;
  uploadProgress?: { current: number; total: number };
  streamedResults?: UploadResult[];
}

export default function UploadResults({
  response,
  isUploading,
  uploadProgress,
  streamedResults,
}: UploadResultsProps) {
  if (isUploading) {
    const progressPercent =
      uploadProgress && uploadProgress.total > 0
        ? Math.round((uploadProgress.current / uploadProgress.total) * 100)
        : 0;

    return (
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-6">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <svg
              className="h-5 w-5 animate-spin text-blue-600"
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
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
            <span className="text-sm font-medium text-blue-800">
              {uploadProgress
                ? `Uploading listing ${uploadProgress.current} of ${uploadProgress.total}...`
                : "Uploading..."}
            </span>
          </div>

          {uploadProgress && uploadProgress.total > 1 && (
            <div className="h-2 w-full overflow-hidden rounded-full bg-blue-200">
              <div
                className="h-full rounded-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          )}

          {streamedResults && streamedResults.length > 0 && (
            <div className="mt-3 space-y-1.5">
              {streamedResults.map((result) => (
                <ResultRow key={result.index} result={result} />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!response) return null;

  const { results, summary } = response;

  return (
    <div className="space-y-4">
      <div className="flex gap-4 rounded-lg border border-gray-200 bg-white p-4">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">
            {summary.total}
          </div>
          <div className="text-xs text-gray-500">Total</div>
        </div>
        {summary.succeeded > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {summary.succeeded}
            </div>
            <div className="text-xs text-gray-500">Succeeded</div>
          </div>
        )}
        {summary.failed > 0 && (
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">
              {summary.failed}
            </div>
            <div className="text-xs text-gray-500">Failed</div>
          </div>
        )}
      </div>

      <div className="space-y-2">
        {results.map((result) => (
          <ResultRow key={result.index} result={result} />
        ))}
      </div>
    </div>
  );
}

function ResultRow({ result }: { result: UploadResult }) {
  return (
    <div
      className={`rounded-lg border p-4 ${
        result.status === "success"
          ? "border-green-200 bg-green-50"
          : "border-red-200 bg-red-50"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {result.status === "success" ? (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M2.5 6L5 8.5L9.5 3.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            ) : (
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-100 text-red-600">
                <svg className="h-3 w-3" viewBox="0 0 12 12" fill="none">
                  <path
                    d="M3 3L9 9M9 3L3 9"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            )}
            <span className="truncate text-sm font-medium text-gray-900">
              {result.title}
            </span>
          </div>
          {result.status === "success" && result.listing_url && (
            <a
              href={result.listing_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 block text-xs text-orange-600 hover:underline"
            >
              View draft on Etsy
            </a>
          )}
          {result.status === "error" && result.error && (
            <p className="mt-1 text-xs text-red-700">{result.error}</p>
          )}
        </div>
      </div>
    </div>
  );
}
