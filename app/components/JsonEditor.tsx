"use client";

import { useState, useCallback } from "react";

interface JsonEditorProps {
  onJsonChange: (raw: string, isValid: boolean, isArray: boolean) => void;
}

export default function JsonEditor({ onJsonChange }: JsonEditorProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback(
    (raw: string) => {
      if (raw.trim().length === 0) {
        setError(null);
        onJsonChange(raw, false, false);
        return;
      }

      try {
        const parsed = JSON.parse(raw);
        const isArray = Array.isArray(parsed);
        const isObject = typeof parsed === "object" && parsed !== null;

        if (!isObject) {
          setError("Input must be a JSON object or array of objects");
          onJsonChange(raw, false, false);
          return;
        }

        if (isArray) {
          const allObjects = parsed.every(
            (item: unknown) =>
              typeof item === "object" && item !== null && !Array.isArray(item)
          );
          if (!allObjects) {
            setError("Array must contain only JSON objects");
            onJsonChange(raw, false, true);
            return;
          }
        }

        setError(null);
        onJsonChange(raw, true, isArray);
      } catch (err) {
        const message =
          err instanceof SyntaxError ? err.message : "Invalid JSON";
        setError(message);
        onJsonChange(raw, false, false);
      }
    },
    [onJsonChange]
  );

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const raw = e.target.value;
    setValue(raw);
    validate(raw);
  };

  const handleFormat = () => {
    try {
      const parsed = JSON.parse(value);
      const formatted = JSON.stringify(parsed, null, 2);
      setValue(formatted);
      validate(formatted);
    } catch {
      // Can't format invalid JSON
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <label
          htmlFor="json-editor"
          className="block text-sm font-medium text-gray-700"
        >
          Listing JSON
        </label>
        {value.trim().length > 0 && !error && (
          <button
            type="button"
            onClick={handleFormat}
            className="text-xs text-gray-500 hover:text-gray-700"
          >
            Format JSON
          </button>
        )}
      </div>
      <textarea
        id="json-editor"
        value={value}
        onChange={handleChange}
        placeholder={`Paste a listing JSON object or array...\n\n{\n  "quantity": 1,\n  "title": "Your Listing Title",\n  "description": "Product description",\n  "price": 19.99,\n  "who_made": "i_did",\n  "when_made": "2020_2023",\n  "taxonomy_id": 1\n}`}
        rows={16}
        spellCheck={false}
        className={`mt-1.5 block w-full rounded-lg border bg-white px-3 py-2 font-mono text-sm transition-colors ${
          error
            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
            : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
        } focus:outline-none focus:ring-1`}
      />
      {error && (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}
