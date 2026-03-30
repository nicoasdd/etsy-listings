"use client";

import { useRef, useCallback, useState } from "react";
import type { UploadedFile } from "@/lib/types/cults3d";

interface FileUploaderProps {
  type: "image" | "model";
  label: string;
  accept: string;
  files: UploadedFile[];
  onFilesChange: (files: UploadedFile[]) => void;
  maxFiles?: number;
}

const MAX_FILE_SIZE = 50 * 1024 * 1024;

export default function FileUploader({
  type,
  label,
  accept,
  files,
  onFilesChange,
  maxFiles = 10,
}: FileUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [storageNotConfigured, setStorageNotConfigured] = useState(false);

  const uploadFile = useCallback(
    async (file: File, tempId: string) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("type", type);

      try {
        const res = await fetch("/api/upload/file", {
          method: "POST",
          body: formData,
        });

        const data = await res.json();

        if (res.status === 503) {
          setStorageNotConfigured(true);
          onFilesChange(
            files.map((f) =>
              f.id === tempId
                ? { ...f, status: "error" as const, error: "Cloud storage not configured" }
                : f
            )
          );
          return;
        }

        if (!res.ok || !data.success) {
          onFilesChange(
            files.map((f) =>
              f.id === tempId
                ? { ...f, status: "error" as const, error: data.error || "Upload failed" }
                : f
            )
          );
          return;
        }

        onFilesChange(
          files.map((f) =>
            f.id === tempId
              ? { ...f, status: "complete" as const, url: data.url, progress: 100 }
              : f
          )
        );
      } catch {
        onFilesChange(
          files.map((f) =>
            f.id === tempId
              ? { ...f, status: "error" as const, error: "Network error during upload" }
              : f
          )
        );
      }
    },
    [type, files, onFilesChange]
  );

  const handleFiles = useCallback(
    (selectedFiles: FileList) => {
      const remaining = maxFiles - files.length;
      const toAdd = Array.from(selectedFiles).slice(0, remaining);

      const newFiles: UploadedFile[] = toAdd.map((file) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        return {
          id,
          originalName: file.name,
          fileType: type,
          size: file.size,
          status: file.size > MAX_FILE_SIZE ? "error" : "uploading",
          error: file.size > MAX_FILE_SIZE ? `File exceeds 50 MB limit` : undefined,
          previewUrl: type === "image" ? URL.createObjectURL(file) : undefined,
        };
      });

      const updated = [...files, ...newFiles];
      onFilesChange(updated);

      toAdd.forEach((file, i) => {
        const entry = newFiles[i];
        if (entry.status === "uploading") {
          uploadFile(file, entry.id);
        }
      });
    },
    [files, maxFiles, type, onFilesChange, uploadFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFiles(e.target.files);
      }
      if (inputRef.current) inputRef.current.value = "";
    },
    [handleFiles]
  );

  const removeFile = useCallback(
    (id: string) => {
      const file = files.find((f) => f.id === id);
      if (file?.previewUrl) URL.revokeObjectURL(file.previewUrl);
      onFilesChange(files.filter((f) => f.id !== id));
    },
    [files, onFilesChange]
  );

  const canAddMore = files.length < maxFiles;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-gray-700">{label}</label>

      {storageNotConfigured && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">
            Cloud storage is not configured. Please set the STORAGE_* environment variables in .env.local.
          </p>
        </div>
      )}

      {canAddMore && !storageNotConfigured && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-4 transition-colors hover:border-blue-400 hover:bg-blue-50"
        >
          <svg
            className="mb-1 h-6 w-6 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 16.5V9.75m0 0l3 3m-3-3l-3 3M6.75 19.5a4.5 4.5 0 01-1.41-8.775 5.25 5.25 0 0110.233-2.33 3 3 0 013.758 3.848A3.752 3.752 0 0118 19.5H6.75z"
            />
          </svg>
          <p className="text-xs text-gray-500">
            Click or drag to upload ({files.length}/{maxFiles})
          </p>
          <input
            ref={inputRef}
            type="file"
            accept={accept}
            multiple
            onChange={handleInputChange}
            className="hidden"
          />
        </div>
      )}

      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file) => (
            <div
              key={file.id}
              className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2"
            >
              {file.previewUrl && (
                <img
                  src={file.previewUrl}
                  alt={file.originalName}
                  className="h-8 w-8 rounded object-cover"
                />
              )}
              {!file.previewUrl && (
                <div className="flex h-8 w-8 items-center justify-center rounded bg-gray-100 text-xs font-medium text-gray-500">
                  {file.originalName.split(".").pop()?.toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-gray-700">
                  {file.originalName}
                </p>
                <p className="text-xs text-gray-400">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB
                </p>
              </div>

              {file.status === "uploading" && (
                <svg
                  className="h-4 w-4 animate-spin text-blue-500"
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
              )}
              {file.status === "complete" && (
                <svg className="h-4 w-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
              {file.status === "error" && (
                <span className="text-xs text-red-500" title={file.error}>
                  Error
                </span>
              )}

              <button
                onClick={() => removeFile(file.id)}
                className="text-gray-400 hover:text-red-500"
                aria-label={`Remove ${file.originalName}`}
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
