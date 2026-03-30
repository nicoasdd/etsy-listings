"use client";

import { useState, useRef, useCallback, useEffect, useMemo } from "react";
import type {
  GeneratedListingFields,
  DualListingFields,
  GenerateDualListingResponse,
} from "@/lib/types/chatgpt";
import type { GeneratedCults3DFields, Cults3DCreateInput, Cults3DCreateResult } from "@/lib/types/cults3d";
import type { WhoMade, WhenMade, ReadinessStateDefinition } from "@/lib/types/etsy";
import Cults3DListingForm from "./Cults3DListingForm";
import type { Cults3DListingFormHandle } from "./Cults3DListingForm";

const ACCEPTED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_SIZE = 20 * 1024 * 1024;

interface TaxonomyOption {
  id: number;
  name: string;
  full_path: string;
}

interface ShippingProfileOption {
  shipping_profile_id: number;
  title: string;
}
const WHEN_MADE_OPTIONS: WhenMade[] = [
  "made_to_order",
  "2020_2026",
  "2010_2019",
  "2007_2009",
  "2000_2006",
  "before_2007",
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
  isCults3DConnected: boolean;
}

type ListingType = "physical" | "download";

interface UserFields {
  type: ListingType;
  readiness_state_id: string;
  price: string;
  quantity: string;
  who_made: WhoMade | "";
  when_made: WhenMade | "";
  taxonomy_id: string;
  shipping_profile_id: string;
}

const emptyUserFields: UserFields = {
  type: "physical",
  readiness_state_id: "",
  price: "",
  quantity: "",
  who_made: "",
  when_made: "",
  taxonomy_id: "",
  shipping_profile_id: "",
};

export default function ListingGenerator({ isEtsyConnected, isCults3DConnected }: Props) {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedFields, setGeneratedFields] =
    useState<DualListingFields | null>(null);
  const [editedEtsyFields, setEditedEtsyFields] =
    useState<GeneratedListingFields | null>(null);
  const [editedCults3DFields, setEditedCults3DFields] =
    useState<GeneratedCults3DFields | null>(null);
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
  const [showCults3DFields, setShowCults3DFields] = useState(false);
  const [newCults3DTagInput, setNewCults3DTagInput] = useState("");
  const [isCults3DSubmitting, setIsCults3DSubmitting] = useState(false);
  const [cults3DSubmitResult, setCults3DSubmitResult] = useState<Cults3DCreateResult | null>(null);
  const [dualSubmitResults, setDualSubmitResults] = useState<{
    etsy?: { success: boolean; message: string; url?: string };
    cults3d?: Cults3DCreateResult;
  } | null>(null);
  const [isDualSubmitting, setIsDualSubmitting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const taxonomyRef = useRef<HTMLDivElement>(null);

  const [taxonomies, setTaxonomies] = useState<TaxonomyOption[]>([]);
  const [shippingProfiles, setShippingProfiles] = useState<ShippingProfileOption[]>([]);
  const [readinessStates, setReadinessStates] = useState<ReadinessStateDefinition[]>([]);
  const [isCreatingReadiness, setIsCreatingReadiness] = useState(false);
  const [taxonomySearch, setTaxonomySearch] = useState("");
  const [taxonomyOpen, setTaxonomyOpen] = useState(false);

  useEffect(() => {
    if (!isEtsyConnected) return;

    fetch("/api/etsy/taxonomies")
      .then((r) => r.json())
      .then((data) => setTaxonomies(data.taxonomies ?? []))
      .catch(() => {});

    fetch("/api/etsy/shipping-profiles")
      .then((r) => r.json())
      .then((data) => setShippingProfiles(data.profiles ?? []))
      .catch(() => {});

    fetch("/api/etsy/readiness-states")
      .then((r) => r.json())
      .then((data) => {
        const defs: ReadinessStateDefinition[] = data.definitions ?? [];
        setReadinessStates(defs);
        if (defs.length > 0 && !userFields.readiness_state_id) {
          setUserFields((f) => ({ ...f, readiness_state_id: String(defs[0].readiness_state_id) }));
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEtsyConnected]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (taxonomyRef.current && !taxonomyRef.current.contains(e.target as Node)) {
        setTaxonomyOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedTaxonomy = useMemo(
    () => taxonomies.find((t) => String(t.id) === userFields.taxonomy_id),
    [taxonomies, userFields.taxonomy_id],
  );

  const filteredTaxonomies = useMemo(() => {
    if (!taxonomySearch.trim()) return taxonomies.slice(0, 50);
    const q = taxonomySearch.toLowerCase();
    return taxonomies
      .filter((t) => t.full_path.toLowerCase().includes(q))
      .slice(0, 50);
  }, [taxonomies, taxonomySearch]);

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
    setEditedEtsyFields(null);
    setEditedCults3DFields(null);
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

      const data: GenerateDualListingResponse = await res.json();

      if (!res.ok || !data.success) {
        if (data.needs_reauth) setNeedsReauth(true);
        setGenerationError(
          data.error || "An error occurred while generating listing fields."
        );
        return;
      }

      if (data.fields) {
        setGeneratedFields(data.fields);
        setEditedEtsyFields({ ...data.fields.etsy });
        setEditedCults3DFields({ ...data.fields.cults3d });
      }
    } catch {
      setGenerationError(
        "Network error. Please check your connection and try again."
      );
    } finally {
      setIsGenerating(false);
    }
  }, [imageFile, description]);

  const updateEtsyField = useCallback(
    <K extends keyof GeneratedListingFields>(
      key: K,
      value: GeneratedListingFields[K]
    ) => {
      setEditedEtsyFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const updateCults3DField = useCallback(
    <K extends keyof GeneratedCults3DFields>(
      key: K,
      value: GeneratedCults3DFields[K]
    ) => {
      setEditedCults3DFields((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    []
  );

  const removeTag = useCallback(
    (index: number) => {
      if (!editedEtsyFields) return;
      const newTags = editedEtsyFields.tags.filter((_, i) => i !== index);
      updateEtsyField("tags", newTags);
    },
    [editedEtsyFields, updateEtsyField]
  );

  const addTag = useCallback(() => {
    if (!editedEtsyFields || !newTagInput.trim()) return;
    if (editedEtsyFields.tags.length >= 13) return;
    const tag = newTagInput.trim().slice(0, 20);
    updateEtsyField("tags", [...editedEtsyFields.tags, tag]);
    setNewTagInput("");
  }, [editedEtsyFields, newTagInput, updateEtsyField]);

  const removeMaterial = useCallback(
    (index: number) => {
      if (!editedEtsyFields) return;
      const newMaterials = editedEtsyFields.materials.filter(
        (_, i) => i !== index
      );
      updateEtsyField("materials", newMaterials);
    },
    [editedEtsyFields, updateEtsyField]
  );

  const addMaterial = useCallback(() => {
    if (!editedEtsyFields || !newMaterialInput.trim()) return;
    updateEtsyField("materials", [
      ...editedEtsyFields.materials,
      newMaterialInput.trim(),
    ]);
    setNewMaterialInput("");
  }, [editedEtsyFields, newMaterialInput, updateEtsyField]);

  const updateStyle = useCallback(
    (index: number, value: string) => {
      if (!editedEtsyFields) return;
      const newStyles = [...editedEtsyFields.styles];
      newStyles[index] = value;
      updateEtsyField("styles", newStyles);
    },
    [editedEtsyFields, updateEtsyField]
  );

  const removeCults3DTag = useCallback(
    (index: number) => {
      if (!editedCults3DFields) return;
      const newTags = editedCults3DFields.tags.filter((_, i) => i !== index);
      updateCults3DField("tags", newTags);
    },
    [editedCults3DFields, updateCults3DField]
  );

  const addCults3DTag = useCallback(() => {
    if (!editedCults3DFields || !newCults3DTagInput.trim()) return;
    if (editedCults3DFields.tags.length >= 15) return;
    updateCults3DField("tags", [...editedCults3DFields.tags, newCults3DTagInput.trim()]);
    setNewCults3DTagInput("");
  }, [editedCults3DFields, newCults3DTagInput, updateCults3DField]);

  const handleCreateReadinessState = useCallback(async (readinessState: "made_to_order" | "ready_to_ship") => {
    setIsCreatingReadiness(true);
    try {
      const res = await fetch("/api/etsy/readiness-states", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          readiness_state: readinessState,
          min_processing_time: readinessState === "ready_to_ship" ? 1 : 3,
          max_processing_time: readinessState === "ready_to_ship" ? 3 : 5,
          processing_time_unit: "days",
        }),
      });
      const data = await res.json();
      if (res.ok && data.definition) {
        const newDef: ReadinessStateDefinition = data.definition;
        setReadinessStates((prev) => [...prev, newDef]);
        setUserFields((f) => ({ ...f, readiness_state_id: String(newDef.readiness_state_id) }));
      }
    } catch {
      // ignore
    } finally {
      setIsCreatingReadiness(false);
    }
  }, []);

  const handleSubmitToCults3D = useCallback(async (input: Cults3DCreateInput) => {
    setIsCults3DSubmitting(true);
    setCults3DSubmitResult(null);

    try {
      const res = await fetch("/api/cults3d/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });

      const data: Cults3DCreateResult = await res.json();
      setCults3DSubmitResult(data);
      setDualSubmitResults((prev) => prev ? { ...prev, cults3d: data } : null);
    } catch {
      const errorResult: Cults3DCreateResult = {
        success: false,
        error: "Network error. Please check your connection and try again.",
      };
      setCults3DSubmitResult(errorResult);
      setDualSubmitResults((prev) => prev ? { ...prev, cults3d: errorResult } : null);
    } finally {
      setIsCults3DSubmitting(false);
    }
  }, []);

  const buildPayload = useCallback(() => {
    if (!editedEtsyFields) return null;

    const payload: Record<string, unknown> = {
      title: editedEtsyFields.title,
      description: editedEtsyFields.description,
      tags: editedEtsyFields.tags,
      materials: editedEtsyFields.materials,
    };

    if (editedEtsyFields.styles.length > 0) {
      payload.styles = editedEtsyFields.styles;
    }

    payload.type = userFields.type;
    if (userFields.type === "physical" && userFields.readiness_state_id) {
      payload.readiness_state_id = parseInt(userFields.readiness_state_id, 10);
    }
    if (userFields.price) payload.price = parseFloat(userFields.price);
    if (userFields.quantity) payload.quantity = parseInt(userFields.quantity, 10);
    if (userFields.who_made) payload.who_made = userFields.who_made;
    if (userFields.when_made) payload.when_made = userFields.when_made;
    if (userFields.taxonomy_id)
      payload.taxonomy_id = parseInt(userFields.taxonomy_id, 10);
    if (userFields.type === "physical" && userFields.shipping_profile_id)
      payload.shipping_profile_id = parseInt(
        userFields.shipping_profile_id,
        10
      );

    return payload;
  }, [editedEtsyFields, userFields]);

  const validateForSubmission = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!editedEtsyFields?.title?.trim()) errors.title = "Title is required";
    if (!editedEtsyFields?.description?.trim())
      errors.description = "Description is required";
    if (!editedEtsyFields?.tags?.length) errors.tags = "At least one tag required";
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
      errors.taxonomy_id = "Category is required";
    if (userFields.type === "physical" && !userFields.readiness_state_id)
      errors.readiness_state_id = "Readiness state is required for physical items";
    if (userFields.type === "physical" && !userFields.shipping_profile_id)
      errors.shipping_profile_id = "Shipping profile is required for physical items";
    return errors;
  }, [editedEtsyFields, userFields]);

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

  const cults3DFormRef = useRef<Cults3DListingFormHandle>(null);

  const handleCreateOnBoth = useCallback(async () => {
    setIsDualSubmitting(true);
    setDualSubmitResults(null);

    const etsyPromise = (async () => {
      const errors = validateForSubmission();
      if (Object.keys(errors).length > 0) {
        setValidationErrors(errors);
        return { success: false, message: "Etsy validation failed. Check required fields." };
      }
      setValidationErrors({});

      const payload = buildPayload();
      const res = await fetch("/api/listings/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || "Failed to create listing on Etsy." };
      }
      const result = data.results?.[0];
      if (result?.status === "success") {
        return { success: true, message: "Draft listing created on Etsy!", url: result.listing_url || result.url };
      }
      if (result?.status === "error") {
        return { success: false, message: result.error || "Failed to create listing on Etsy." };
      }
      return { success: true, message: "Listing submitted to Etsy!" };
    })().catch(() => ({
      success: false,
      message: "Network error creating Etsy listing.",
    }));

    // Trigger Cults3D form submission via ref
    cults3DFormRef.current?.triggerSubmit();

    const etsyResult = await etsyPromise;
    setDualSubmitResults({
      etsy: etsyResult,
    });

    setIsDualSubmitting(false);
  }, [validateForSubmission, buildPayload]);

  const currentFields = editedEtsyFields;

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
            <h3 className="text-sm font-semibold text-orange-800">
              Etsy Listing Fields
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
                onChange={(e) => updateEtsyField("title", e.target.value)}
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
                onChange={(e) => updateEtsyField("description", e.target.value)}
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
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-700">
                      Listing Type
                    </label>
                    <div className="mt-1 flex rounded-lg border border-gray-300 p-0.5">
                      <button
                        type="button"
                        onClick={() =>
                          setUserFields((f) => ({ ...f, type: "physical" }))
                        }
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          userFields.type === "physical"
                            ? "bg-orange-500 text-white"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Physical
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setUserFields((f) => ({
                            ...f,
                            type: "download",
                            shipping_profile_id: "",
                          }))
                        }
                        className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                          userFields.type === "download"
                            ? "bg-orange-500 text-white"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Digital Download
                      </button>
                    </div>
                  </div>

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

                  {userFields.type === "physical" && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700">
                        Processing Profile
                      </label>
                      {readinessStates.length > 0 ? (
                        <select
                          value={userFields.readiness_state_id}
                          onChange={(e) =>
                            setUserFields((f) => ({
                              ...f,
                              readiness_state_id: e.target.value,
                            }))
                          }
                          className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                            validationErrors.readiness_state_id
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                          }`}
                        >
                          <option value="">Select...</option>
                          {readinessStates.map((rs) => (
                            <option key={rs.readiness_state_id} value={String(rs.readiness_state_id)}>
                              {rs.readiness_state.replace(/_/g, " ")} ({rs.min_processing_time}-{rs.max_processing_time} {rs.processing_time_unit})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="mt-1 space-y-2">
                          <p className="text-xs text-gray-500">
                            No processing profiles found. Create one:
                          </p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleCreateReadinessState("made_to_order")}
                              disabled={isCreatingReadiness}
                              className="flex-1 rounded-lg border border-orange-400 px-2 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                            >
                              {isCreatingReadiness ? "Creating..." : "Made to order (3-5 days)"}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCreateReadinessState("ready_to_ship")}
                              disabled={isCreatingReadiness}
                              className="flex-1 rounded-lg border border-orange-400 px-2 py-1.5 text-xs font-medium text-orange-600 hover:bg-orange-50 disabled:opacity-50"
                            >
                              {isCreatingReadiness ? "Creating..." : "Ready to ship (1-3 days)"}
                            </button>
                          </div>
                        </div>
                      )}
                      {validationErrors.readiness_state_id && (
                        <p className="mt-0.5 text-xs text-red-600">
                          {validationErrors.readiness_state_id}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="col-span-2" ref={taxonomyRef}>
                    <label className="block text-xs font-medium text-gray-700">
                      Category (Taxonomy)
                    </label>
                    {selectedTaxonomy ? (
                      <div
                        className={`mt-1 flex items-center justify-between rounded-lg border px-3 py-1.5 ${
                          validationErrors.taxonomy_id
                            ? "border-red-300"
                            : "border-gray-300"
                        }`}
                      >
                        <span className="truncate text-sm text-gray-900">
                          {selectedTaxonomy.full_path}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setUserFields((f) => ({ ...f, taxonomy_id: "" }))
                          }
                          className="ml-2 shrink-0 text-gray-400 hover:text-gray-600"
                        >
                          &times;
                        </button>
                      </div>
                    ) : (
                      <div className="relative">
                        <input
                          type="text"
                          value={taxonomySearch}
                          onChange={(e) => {
                            setTaxonomySearch(e.target.value);
                            setTaxonomyOpen(true);
                          }}
                          onFocus={() => setTaxonomyOpen(true)}
                          placeholder={
                            taxonomies.length
                              ? "Search categories..."
                              : "Loading categories..."
                          }
                          className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                            validationErrors.taxonomy_id
                              ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                              : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                          }`}
                        />
                        {taxonomyOpen && filteredTaxonomies.length > 0 && (
                          <ul className="absolute z-20 mt-1 max-h-48 w-full overflow-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {filteredTaxonomies.map((t) => (
                              <li
                                key={t.id}
                                onClick={() => {
                                  setUserFields((f) => ({
                                    ...f,
                                    taxonomy_id: String(t.id),
                                  }));
                                  setTaxonomySearch("");
                                  setTaxonomyOpen(false);
                                }}
                                className="cursor-pointer truncate px-3 py-1.5 text-sm text-gray-700 hover:bg-orange-50 hover:text-orange-800"
                              >
                                {t.full_path}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {validationErrors.taxonomy_id && (
                      <p className="mt-0.5 text-xs text-red-600">
                        {validationErrors.taxonomy_id}
                      </p>
                    )}
                  </div>

                  {userFields.type === "physical" && (
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-700">
                        Shipping Profile
                      </label>
                      <select
                        value={userFields.shipping_profile_id}
                        onChange={(e) =>
                          setUserFields((f) => ({
                            ...f,
                            shipping_profile_id: e.target.value,
                          }))
                        }
                        className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
                          validationErrors.shipping_profile_id
                            ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                            : "border-gray-300 focus:border-orange-500 focus:ring-orange-500"
                        }`}
                      >
                        <option value="">
                          {shippingProfiles.length
                            ? "Select a shipping profile..."
                            : "Loading profiles..."}
                        </option>
                        {shippingProfiles.map((p) => (
                          <option
                            key={p.shipping_profile_id}
                            value={String(p.shipping_profile_id)}
                          >
                            {p.title}
                          </option>
                        ))}
                      </select>
                      {validationErrors.shipping_profile_id && (
                        <p className="mt-0.5 text-xs text-red-600">
                          {validationErrors.shipping_profile_id}
                        </p>
                      )}
                    </div>
                  )}
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

        {/* Cults3D Listing Fields */}
        {editedCults3DFields && (
          <div className="space-y-4 rounded-lg border border-blue-200 bg-blue-50/30 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-800">
                Cults3D Listing Fields
              </h3>
              <button
                onClick={() => setShowCults3DFields((v) => !v)}
                className="text-xs font-medium text-blue-600 hover:text-blue-800"
              >
                {showCults3DFields ? "Collapse" : "Expand"}
              </button>
            </div>

            {showCults3DFields && (
              <div className="space-y-4">
                {/* Name */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Name
                  </label>
                  <input
                    type="text"
                    value={editedCults3DFields.name}
                    onChange={(e) => updateCults3DField("name", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Description */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Description
                  </label>
                  <textarea
                    value={editedCults3DFields.description}
                    onChange={(e) => updateCults3DField("description", e.target.value)}
                    rows={6}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  />
                </div>

                {/* Tags */}
                <div>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-medium text-gray-700">
                      Tags
                    </label>
                    <span className={`text-xs ${editedCults3DFields.tags.length > 15 ? "font-semibold text-red-600" : "text-gray-400"}`}>
                      {editedCults3DFields.tags.length} / 15
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {editedCults3DFields.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800"
                      >
                        {tag}
                        <button
                          onClick={() => removeCults3DTag(i)}
                          className="ml-0.5 text-blue-600 hover:text-blue-900"
                          aria-label={`Remove tag ${tag}`}
                        >
                          &times;
                        </button>
                      </span>
                    ))}
                  </div>
                  {editedCults3DFields.tags.length < 15 && (
                    <div className="mt-2 flex gap-2">
                      <input
                        type="text"
                        value={newCults3DTagInput}
                        onChange={(e) => setNewCults3DTagInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addCults3DTag();
                          }
                        }}
                        placeholder="Add a tag"
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                      />
                      <button
                        onClick={addCults3DTag}
                        disabled={!newCults3DTagInput.trim()}
                        className="rounded-lg border border-blue-500 px-3 py-1.5 text-xs font-medium text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                      >
                        Add
                      </button>
                    </div>
                  )}
                </div>

                {/* Suggested Category */}
                <div>
                  <label className="block text-xs font-medium text-gray-700">
                    Suggested Category
                  </label>
                  <p className="mt-1 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                    {editedCults3DFields.suggested_category || "—"}
                  </p>
                </div>

                {/* Cults3D Listing Form (files, category, license, pricing) */}
                <div className="border-t border-blue-200 pt-4">
                  <Cults3DListingForm
                    ref={cults3DFormRef}
                    fields={editedCults3DFields}
                    imageFile={imageFile}
                    isCults3DConnected={isCults3DConnected}
                    onSubmit={handleSubmitToCults3D}
                    isSubmitting={isCults3DSubmitting}
                    submitResult={cults3DSubmitResult}
                  />
                </div>
              </div>
            )}

            {!showCults3DFields && (
              <p className="text-xs text-gray-500">
                {editedCults3DFields.name} — {editedCults3DFields.tags.length} tags — Category: {editedCults3DFields.suggested_category}
              </p>
            )}
          </div>
        )}

        {/* Create on Both Marketplaces */}
        {generatedFields && isEtsyConnected && isCults3DConnected && (
          <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4">
            <h3 className="text-sm font-semibold text-purple-800">
              Create on Both Marketplaces
            </h3>
            <p className="mt-1 text-xs text-gray-500">
              Submits to Etsy and Cults3D simultaneously. Make sure both forms are filled in above.
            </p>
            <button
              onClick={handleCreateOnBoth}
              disabled={isDualSubmitting || isSubmitting || isCults3DSubmitting}
              className="mt-3 w-full rounded-lg bg-purple-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-purple-700 disabled:opacity-50"
            >
              {isDualSubmitting ? "Creating on both..." : "Create on Both Marketplaces"}
            </button>

            {dualSubmitResults && (
              <div className="mt-3 space-y-2">
                {dualSubmitResults.etsy && (
                  <div className={`rounded-lg border p-2 ${dualSubmitResults.etsy.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                    <p className={`text-xs font-medium ${dualSubmitResults.etsy.success ? "text-green-700" : "text-red-700"}`}>
                      Etsy: {dualSubmitResults.etsy.message}
                    </p>
                    {dualSubmitResults.etsy.url && (
                      <a href={dualSubmitResults.etsy.url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:text-green-800">
                        View on Etsy &rarr;
                      </a>
                    )}
                  </div>
                )}
                {dualSubmitResults.cults3d && (
                  <div className={`rounded-lg border p-2 ${dualSubmitResults.cults3d.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                    <p className={`text-xs font-medium ${dualSubmitResults.cults3d.success ? "text-green-700" : "text-red-700"}`}>
                      Cults3D: {dualSubmitResults.cults3d.success ? "Design created!" : dualSubmitResults.cults3d.error}
                    </p>
                    {dualSubmitResults.cults3d.url && (
                      <a href={dualSubmitResults.cults3d.url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:text-green-800">
                        View on Cults3D &rarr;
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
