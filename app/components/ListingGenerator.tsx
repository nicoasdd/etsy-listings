"use client";

import { useState, useRef, useCallback } from "react";
import type {
  GeneratedListingFields,
  GenerateListingResponse,
} from "@/lib/types/chatgpt";
import type { WhoMade, WhenMade } from "@/lib/types/etsy";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;
const WHEN_MADE_OPTIONS: WhenMade[] = [
  "made_to_order",
  "2020_2023",
  "2010_2019",
  "2004_2009",
  "2000_2003",
  "before_2004",
  "1990s",
  "1980s",
  "1970s",
  "1960s",
  "1950s",
  "1940s",
  "1930s",
  "1920s",
  "1910s",
  "1900s",
  "1800s",
  "1700s",
  "before_1700",
];

interface Props {
  isEtsyConnected: boolean;
}

interface UserFields {
  price: string;
  quantity: string;
  who_made: WhoMade | "";
  when_made: WhenMade | "";
  taxonomy_id: string;
  shipping_profile_id: string;
}

const emptyUserFields: UserFields = {
  price: "",
  quantity: "",
  who_made: "",
  when_made: "",
  taxonomy_id: "",
  shipping_profile_id: "",
};

export default function ListingGenerator({ isEtsyConnected }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFields, setGeneratedFields] =
    useState<GeneratedListingFields | null>(null);
  const [editedFields, setEditedFields] =
    useState<GeneratedListingFields | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [needsReauth, setNeedsReauth] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  const [userFields, setUserFields] = useState<UserFields>(emptyUserFields);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{
    success: boolean;
    message: string;
    url?: string;
  } | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

  const [copied, setCopied] = useState(false);
  const [newTagInput, setNewTagInput] = useState("");
  const [newMaterialInput, setNewMaterialInput] = useState("");
  const [showEtsyDetails, setShowEtsyDetails] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback((file: File): string | null => {
    if (!ACCEPTED_TYPES.has(file.type)) {
      return "Accepted formats: JPEG, PNG, WebP";
    }
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1);
      return `Image must be under 20 MB (yours: ${sizeMB} MB)`;
    }
    return null;
  }, []);

  const handleFileSelect = useCallback(
    (file: File) => {
      setFileError(null);
      const error = validateFile(file);
      if (error) {
        setFileError(error);
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setGenerationError(null);
      setNeedsReauth(false);
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const files = e.dataTransfer.files;
      if (files.length > 1) {
        setFileError("Only one image per generation");
      }
      if (files.length > 0) {
        handleFileSelect(files[0]);
      }
    },
    [handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFileSelect(file);
    },
    [handleFileSelect]
  );

  const clearImage = useCallback(() => {
    setImageFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [imagePreview]);

  const generate = useCallback(async () => {
    if (!imageFile) return;

    setIsGenerating(true);
    setGenerationError(null);
    setNeedsReauth(false);
    setGeneratedFields(null);
    setEditedFields(null);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      if (description.trim()) {
        formData.append("description", description.trim());
      }

      const res = await fetch("/api/chatgpt/generate", {
        method: "POST",
        body: formData,
      });

      const data: GenerateListingResponse = await res.json();

      if (!res.ok || !data.success) {
        if (data.needs_reauth) setNeedsReauth(true);
        setGenerationError(
          data.error || "An error occurred while generating listing fields."
        );
        return;
      }

      if (data.fields) {
        setGeneratedFields(data.fields);
        setEditedFields({ ...data.fields });
      }
    } catch {
      setGenerationError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }, [imageFile, description]);

  const updateField = useCallback(
    <K extends keyof GeneratedListingFields>(
      key: K,
      value: GeneratedListingFields[K]
    ) => {
      setEditedFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const removeTag = useCallback(
    (index: number) => {
      if (!editedFields) return;
      const newTags = editedFields.tags.filter((_, i) => i !== index);
      updateField("tags", newTags);
    },
    [editedFields, updateField]
  );

  const addTag = useCallback(() => {
    if (!editedFields || !newTagInput.trim()) return;
    if (editedFields.tags.length >= 13) return;
    const tag = newTagInput.trim().slice(0, 20);
    updateField("tags", [...editedFields.tags, tag]);
    setNewTagInput("");
  }, [editedFields, newTagInput, updateField]);

  const removeMaterial = useCallback(
    (index: number) => {
      if (!editedFields) return;
      const newMaterials = editedFields.materials.filter(
        (_, i) => i !== index
      );
      updateField("materials", newMaterials);
    },
    [editedFields, updateField]
  );

  const addMaterial = useCallback(() => {
    if (!editedFields || !newMaterialInput.trim()) return;
    updateField("materials", [
      ...editedFields.materials,
      newMaterialInput.trim(),
    ]);
    setNewMaterialInput("");
  }, [editedFields, newMaterialInput, updateField]);

  const updateStyle = useCallback(
    (index: number, value: string) => {
      if (!editedFields) return;
      const newStyles = [...editedFields.styles];
      newStyles[index] = value;
      updateField("styles", newStyles);
    },
    [editedFields, updateField]
  );

  const buildPayload = useCallback(() => {
    if (!editedFields) return null;

    const payload: Record<string, unknown> = {
      title: editedFields.title,
      description: editedFields.description,
      tags: editedFields.tags,
      materials: editedFields.materials,
    };

    if (editedFields.styles.length > 0) {
      payload.styles = editedFields.styles;
    }

    if (userFields.price) payload.price = parseFloat(userFields.price);
    if (userFields.quantity) payload.quantity = parseInt(userFields.quantity, 10);
    if (userFields.who_made) payload.who_made = userFields.who_made;
    if (userFields.when_made) payload.when_made = userFields.when_made;
    if (userFields.taxonomy_id)
      payload.taxonomy_id = parseInt(userFields.taxonomy_id, 10);
    if (userFields.shipping_profile_id)
      payload.shipping_profile_id = parseInt(
        userFields.shipping_profile_id,
        10
      );

    return payload;
  }, [editedFields, userFields]);

  const validateForSubmission = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!editedFields?.title?.trim()) errors.title = "Title is required";
    if (!editedFields?.description?.trim())
      errors.description = "Description is required";
    if (!editedFields?.tags?.length) errors.tags = "At least one tag required";
    if (!userFields.price || parseFloat(userFields.price) <= 0)
      errors.price = "Price must be greater than 0";
    if (
      !userFields.quantity ||
      parseInt(userFields.quantity, 10) <= 0 ||
      !Number.isInteger(Number(userFields.quantity))
    )
      errors.quantity = "Quantity must be a positive integer";
    if (!userFields.who_made) errors.who_made = "Who made is required";
    if (!userFields.when_made) errors.when_made = "When made is required";
    if (
      !userFields.taxonomy_id ||
      parseInt(userFields.taxonomy_id, 10) <= 0
    )
      errors.taxonomy_id = "Taxonomy ID is required";
    return errors;
  }, [editedFields, userFields]);

  const handleSubmitToEtsy = useCallback(async () => {
    const errors = validateForSubmission();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});
    setIsSubmitting(true);
    setSubmitResult(null);
    setSubmitError(null);

    try {
      const payload = buildPayload();
      const res = await fetch("/api/listings/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(
          data.error || "Failed to create listing on Etsy."
        );
        return;
      }

      const result = data.results?.[0];
      if (result?.status === "success") {
        setSubmitResult({
          success: true,
          message: "Draft listing created successfully!",
          url: result.listing_url || result.url,
        });
      } else if (result?.status === "error") {
        setSubmitError(result.error || "Failed to create listing on Etsy.");
      } else {
        setSubmitResult({
          success: true,
          message: "Listing submitted successfully!",
        });
      }
    } catch {
      setSubmitError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [buildPayload, validateForSubmission]);

  const handleCopyAsJson = useCallback(async () => {
    const payload = buildPayload();
    if (!payload) return;

    try {
      await navigator.clipboard.writeText(JSON.stringify(payload, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback not needed for local app
    }
  }, [buildPayload]);

  const currentFields = editedFields;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Generate Listing from Image
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        Upload a product photo and ChatGPT will generate optimized Etsy listing
        fields.
      </p>

      <div className="mt-4 space-y-4">
        {/* Image upload zone */}
        {!imageFile ? (
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 transition-colors hover:border-orange-400 hover:bg-orange-50"
          >
            <svg
              className="mb-3 h-10 w-10 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.41a2.25 2.25 0 013.182 0l2.909 2.91m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"
              />
            </svg>
            <p className="text-sm font-medium text-gray-600">
              Click to upload or drag and drop
            </p>
            <p className="mt-1 text-xs text-gray-400">
              JPEG, PNG, or WebP (max 20 MB)
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileInputChange}
              className="hidden"
            />
          </div>
        ) : (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
            <div className="flex items-start gap-4">
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Product preview"
                  className="h-24 w-24 rounded-lg object-cover"
                />
              )}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">
                  {imageFile.name}
                </p>
                <p className="text-xs text-gray-500">
                  {(imageFile.size / (1024 * 1024)).toFixed(1)} MB
                </p>
                <button
                  onClick={clearImage}
                  className="mt-2 text-xs font-medium text-red-600 hover:text-red-800"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        )}

        {fileError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{fileError}</p>
          </div>
        )}

        {/* Description field */}
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Brief product description (optional)"
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />

        {/* Generate button */}
        <button
          onClick={generate}
          disabled={!imageFile || isGenerating}
          className="w-full rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isGenerating ? "Analyzing image..." : "Generate Listing"}
        </button>

        {/* Loading indicator */}
        {isGenerating && (
          <div className="flex items-center gap-2">
            <svg
              className="h-4 w-4 animate-spin text-orange-500"
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
            <span className="text-sm text-gray-500">
              Analyzing image and generating listing fields...
            </span>
          </div>
        )}

        {/* Error display */}
        {generationError && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4">
            <p className="text-sm text-red-700">{generationError}</p>
            {needsReauth ? (
              <p className="mt-2 text-sm font-medium text-red-600">
                Please reconnect your ChatGPT account above.
              </p>
            ) : (
              <button
                onClick={generate}
                disabled={isGenerating}
                className="mt-2 text-sm font-medium text-red-600 hover:text-red-800"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {/* Generated/Edited fields form */}
        {currentFields && (
          <div className="space-y-4 rounded-lg border border-gray-200 bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-900">
              Generated Listing Fields
            </h3>

            {/* Title */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-700">
                  Title
                </label>
                <span
                  className={`text-xs ${currentFields.title.length > 140 ? "font-semibold text-red-600" : "text-gray-400"}`}
                >
                  {currentFields.title.length} / 140
                </span>
              </div>
              <input
                type="text"
                value={currentFields.title}
                onChange={(e) => updateField("title", e.target.value)}
                className={`mt-1 w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
                  currentFields.title.length > 140
                    ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                }`}
              />
              {currentFields.title.length > 140 && (
                <p className="mt-1 text-xs text-red-600">
                  Title exceeds 140 character limit
                </p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={currentFields.description}
                onChange={(e) => updateField("description", e.target.value)}
                rows={6}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
              />
            </div>

            {/* Tags */}
            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-medium text-gray-700">
                  Tags
                </label>
                <span
                  className={`text-xs ${currentFields.tags.length > 13 ? "font-semibold text-red-600" : "text-gray-400"}`}
                >
                  {currentFields.tags.length} / 13
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                {currentFields.tags.map((tag, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800"
                  >
                    {tag}
                    <button
                      onClick={() => removeTag(i)}
                      className="ml-0.5 text-orange-600 hover:text-orange-900"
                      aria-label={`Remove tag ${tag}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              {currentFields.tags.length < 13 && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addTag();
                      }
                    }}
                    placeholder="Add a tag (max 20 chars)"
                    maxLength={20}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                  <button
                    onClick={addTag}
                    disabled={!newTagInput.trim()}
                    className="rounded-lg border border-orange-500 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                  >
                    Add
                  </button>
                </div>
              )}
            </div>

            {/* Materials */}
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Materials
              </label>
              <div className="mt-1 flex flex-wrap gap-2">
                {currentFields.materials.map((material, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 rounded-full bg-gray-200 px-2.5 py-0.5 text-xs font-medium text-gray-700"
                  >
                    {material}
                    <button
                      onClick={() => removeMaterial(i)}
                      className="ml-0.5 text-gray-500 hover:text-gray-800"
                      aria-label={`Remove material ${material}`}
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={newMaterialInput}
                  onChange={(e) => setNewMaterialInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addMaterial();
                    }
                  }}
                  placeholder="Add a material"
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                />
                <button
                  onClick={addMaterial}
                  disabled={!newMaterialInput.trim()}
                  className="rounded-lg border border-orange-500 px-3 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Styles */}
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Styles (max 2)
              </label>
              <div className="mt-1 flex gap-2">
                {[0, 1].map((idx) => (
                  <input
                    key={idx}
                    type="text"
                    value={currentFields.styles[idx] || ""}
                    onChange={(e) => updateStyle(idx, e.target.value)}
                    placeholder={`Style ${idx + 1}`}
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                  />
                ))}
              </div>
            </div>

            {/* Suggested Category */}
            <div>
              <label className="block text-xs font-medium text-gray-700">
                Suggested Category
              </label>
              <p className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                {currentFields.suggested_category || "—"}
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex flex-wrap gap-2 border-t border-gray-200 pt-4">
              <button
                onClick={generate}
                disabled={isGenerating}
                className="rounded-lg border border-orange-500 px-4 py-2 text-sm font-medium text-orange-600 transition-colors hover:bg-orange-50 disabled:opacity-50"
              >
                {isGenerating ? "Regenerating..." : "Regenerate"}
              </button>

              <button
                onClick={handleCopyAsJson}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
              >
                {copied ? "Copied!" : "Copy as JSON"}
              </button>

              {isEtsyConnected ? (
                <button
                  onClick={() => setShowEtsyDetails((v) => !v)}
                  className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-orange-600"
                >
                  {showEtsyDetails
                    ? "Hide Etsy Details"
                    : "Create Listing on Etsy"}
                </button>
              ) : (
                <button
                  disabled
                  className="cursor-not-allowed rounded-lg bg-gray-300 px-4 py-2 text-sm font-medium text-gray-500"
                >
                  Connect Etsy to create listings
                </button>
              )}
            </div>

            {/* Etsy submission form */}
            {showEtsyDetails && isEtsyConnected && (
              <div className="space-y-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
                <h4 className="text-sm font-semibold text-gray-900">
                  Listing Details (Required for Etsy)
                </h4>

                {currentFields.suggested_category && (
                  <p className="text-xs text-gray-500">
                    AI suggests category:{" "}
                    <span className="font-medium">
                      {currentFields.suggested_category}
                    </span>
                  </p>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Price ($)
                    </label>
                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={userFields.price}
                      onChange={(e) =>
                        setUserFields((f) => ({ ...f, price: e.target.value }))
                      }
                      className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                        validationErrors.price
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      }`}
                    />
                    {validationErrors.price && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {validationErrors.price}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={userFields.quantity}
                      onChange={(e) =>
                        setUserFields((f) => ({
                          ...f,
                          quantity: e.target.value,
                        }))
                      }
                      className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                        validationErrors.quantity
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      }`}
                    />
                    {validationErrors.quantity && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {validationErrors.quantity}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Who Made
                    </label>
                    <select
                      value={userFields.who_made}
                      onChange={(e) =>
                        setUserFields((f) => ({
                          ...f,
                          who_made: e.target.value as WhoMade | "",
                        }))
                      }
                      className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                        validationErrors.who_made
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      }`}
                    >
                      <option value="">Select...</option>
                      <option value="i_did">I did</option>
                      <option value="someone_else">Someone else</option>
                      <option value="collective">Collective</option>
                    </select>
                    {validationErrors.who_made && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {validationErrors.who_made}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      When Made
                    </label>
                    <select
                      value={userFields.when_made}
                      onChange={(e) =>
                        setUserFields((f) => ({
                          ...f,
                          when_made: e.target.value as WhenMade | "",
                        }))
                      }
                      className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                        validationErrors.when_made
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      }`}
                    >
                      <option value="">Select...</option>
                      {WHEN_MADE_OPTIONS.map((opt) => (
                        <option key={opt} value={opt}>
                          {opt.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>
                    {validationErrors.when_made && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {validationErrors.when_made}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Taxonomy ID
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={userFields.taxonomy_id}
                      onChange={(e) =>
                        setUserFields((f) => ({
                          ...f,
                          taxonomy_id: e.target.value,
                        }))
                      }
                      className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                        validationErrors.taxonomy_id
                          ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                          : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                      }`}
                    />
                    {validationErrors.taxonomy_id && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {validationErrors.taxonomy_id}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700">
                      Shipping Profile ID{" "}
                      <span className="text-gray-400">(optional)</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={userFields.shipping_profile_id}
                      onChange={(e) =>
                        setUserFields((f) => ({
                          ...f,
                          shipping_profile_id: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-orange-500 focus:outline-none focus:ring-1 focus:ring-orange-500"
                    />
                  </div>
                </div>

                <button
                  onClick={handleSubmitToEtsy}
                  disabled={isSubmitting}
                  className="w-full rounded-lg bg-orange-500 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-600 disabled:opacity-50"
                >
                  {isSubmitting
                    ? "Creating listing..."
                    : "Create Draft Listing on Etsy"}
                </button>

                {submitError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <p className="text-sm text-red-700">{submitError}</p>
                  </div>
                )}

                {submitResult?.success && (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                    <p className="text-sm text-green-700">
                      {submitResult.message}
                    </p>
                    {submitResult.url && (
                      <a
                        href={submitResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-block text-sm font-medium text-green-600 hover:text-green-800"
                      >
                        View on Etsy &rarr;
                      </a>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
