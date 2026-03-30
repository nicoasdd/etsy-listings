"use client";

import { useState, useEffect, useCallback, useImperativeHandle, forwardRef } from "react";
import type {
  GeneratedCults3DFields,
  Cults3DCategory,
  Cults3DLicense,
  Cults3DCreateInput,
  Cults3DCreateResult,
  UploadedFile,
} from "@/lib/types/cults3d";
import FileUploader from "./FileUploader";

export interface Cults3DListingFormHandle {
  triggerSubmit: () => void;
}

interface Cults3DListingFormProps {
  fields: GeneratedCults3DFields | null;
  imageFile: File | null;
  isCults3DConnected: boolean;
  onSubmit: (input: Cults3DCreateInput) => void;
  isSubmitting: boolean;
  submitResult: Cults3DCreateResult | null;
}

const CURRENCIES = ["EUR", "USD", "GBP", "CAD", "AUD", "CHF", "JPY"];
const LOCALES = ["EN", "FR", "DE", "ES", "IT", "PT", "NL", "PL", "JA", "ZH"];

const Cults3DListingForm = forwardRef<Cults3DListingFormHandle, Cults3DListingFormProps>(function Cults3DListingForm({
  fields,
  imageFile,
  isCults3DConnected,
  onSubmit,
  isSubmitting,
  submitResult,
}, ref) {
  const [categories, setCategories] = useState<Cults3DCategory[]>([]);
  const [licenses, setLicenses] = useState<Cults3DLicense[]>([]);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingLicenses, setLoadingLicenses] = useState(false);

  const [imageFiles, setImageFiles] = useState<UploadedFile[]>([]);
  const [modelFiles, setModelFiles] = useState<UploadedFile[]>([]);
  const [categoryId, setCategoryId] = useState("");
  const [subCategoryIds, setSubCategoryIds] = useState<string[]>([]);
  const [downloadPrice, setDownloadPrice] = useState("0");
  const [currency, setCurrency] = useState("EUR");
  const [locale, setLocale] = useState("EN");
  const [licenseCode, setLicenseCode] = useState("");
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [imageAutoAttached, setImageAutoAttached] = useState(false);

  useEffect(() => {
    if (!isCults3DConnected) return;

    setLoadingCategories(true);
    fetch("/api/cults3d/categories")
      .then(async (res) => {
        const data = await res.json();
        if (res.status === 401) {
          setCategoriesError("Cults3D credentials are no longer valid. Please reconnect.");
          return;
        }
        if (data.categories) setCategories(data.categories);
        else setCategoriesError(data.error || "Failed to load categories");
      })
      .catch(() => setCategoriesError("Failed to load categories"))
      .finally(() => setLoadingCategories(false));

    setLoadingLicenses(true);
    fetch("/api/cults3d/licenses")
      .then((res) => res.json())
      .then((data) => {
        if (data.licenses) setLicenses(data.licenses);
      })
      .catch(() => {})
      .finally(() => setLoadingLicenses(false));
  }, [isCults3DConnected]);

  // Auto-attach the AI analysis image as the first preview image
  useEffect(() => {
    if (!imageFile || imageAutoAttached) return;
    setImageAutoAttached(true);

    const id = `auto-${Date.now()}`;
    const entry: UploadedFile = {
      id,
      originalName: imageFile.name,
      fileType: "image",
      size: imageFile.size,
      status: "uploading",
      previewUrl: URL.createObjectURL(imageFile),
    };

    setImageFiles((prev) => [entry, ...prev]);

    const formData = new FormData();
    formData.append("file", imageFile);
    formData.append("type", "image");

    fetch("/api/upload/file", { method: "POST", body: formData })
      .then((res) => res.json())
      .then((data) => {
        setImageFiles((prev) =>
          prev.map((f) =>
            f.id === id
              ? data.success
                ? { ...f, status: "complete" as const, url: data.url, progress: 100 }
                : { ...f, status: "error" as const, error: data.error }
              : f
          )
        );
      })
      .catch(() => {
        setImageFiles((prev) =>
          prev.map((f) =>
            f.id === id ? { ...f, status: "error" as const, error: "Upload failed" } : f
          )
        );
      });
  }, [imageFile, imageAutoAttached]);

  const filteredLicenses = licenses.filter((l) => {
    const price = parseFloat(downloadPrice) || 0;
    return price === 0 ? l.availableOnFreeDesigns : l.availableOnPricedDesigns;
  });

  // Clear license if it becomes unavailable after price change
  useEffect(() => {
    if (licenseCode && !filteredLicenses.find((l) => l.code === licenseCode)) {
      setLicenseCode("");
    }
  }, [filteredLicenses, licenseCode]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  const validate = useCallback((): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!fields?.name?.trim()) errors.name = "Name is required";
    if (!fields?.description?.trim()) errors.description = "Description is required";

    const completedImages = imageFiles.filter((f) => f.status === "complete");
    if (completedImages.length === 0) errors.images = "At least one preview image is required";

    const completedModels = modelFiles.filter((f) => f.status === "complete");
    if (completedModels.length === 0) errors.models = "At least one 3D model file is required";

    const price = parseFloat(downloadPrice);
    if (isNaN(price) || price < 0) errors.price = "Price must be 0 or greater";
    if (!currency) errors.currency = "Currency is required";
    if (!categoryId) errors.category = "Category is required";

    return errors;
  }, [fields, imageFiles, modelFiles, downloadPrice, currency, categoryId]);

  const handleSubmit = useCallback(() => {
    const errors = validate();
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors({});

    const input: Cults3DCreateInput = {
      name: fields!.name,
      description: fields!.description,
      tags: fields!.tags,
      imageUrls: imageFiles.filter((f) => f.status === "complete").map((f) => f.url!),
      fileUrls: modelFiles.filter((f) => f.status === "complete").map((f) => f.url!),
      categoryId,
      subCategoryIds: subCategoryIds.length > 0 ? subCategoryIds : undefined,
      downloadPrice: parseFloat(downloadPrice) || 0,
      currency,
      locale,
      licenseCode: licenseCode || undefined,
    };

    onSubmit(input);
  }, [fields, imageFiles, modelFiles, categoryId, subCategoryIds, downloadPrice, currency, locale, licenseCode, validate, onSubmit]);

  useImperativeHandle(ref, () => ({
    triggerSubmit: handleSubmit,
  }), [handleSubmit]);

  if (!isCults3DConnected) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-500">
          Connect to Cults3D above to create listings.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* File uploads */}
      <FileUploader
        type="image"
        label="Preview Images"
        accept="image/jpeg,image/png,image/webp"
        files={imageFiles}
        onFilesChange={setImageFiles}
        maxFiles={10}
      />
      {validationErrors.images && (
        <p className="text-xs text-red-600">{validationErrors.images}</p>
      )}

      <FileUploader
        type="model"
        label="3D Model Files"
        accept=".stl,.obj,.3mf,.step,.stp,.scad,.blend"
        files={modelFiles}
        onFilesChange={setModelFiles}
        maxFiles={10}
      />
      {validationErrors.models && (
        <p className="text-xs text-red-600">{validationErrors.models}</p>
      )}

      {/* Category selector */}
      <div>
        <label className="block text-xs font-medium text-gray-700">Category</label>
        {loadingCategories ? (
          <p className="mt-1 text-xs text-gray-400">Loading categories...</p>
        ) : categoriesError ? (
          <div className="mt-1">
            <p className="text-xs text-red-500">{categoriesError}</p>
            {fields?.suggested_category && (
              <p className="mt-1 text-xs text-gray-500">
                AI suggested: <span className="font-medium">{fields.suggested_category}</span>
              </p>
            )}
            <input
              type="text"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              placeholder="Enter category ID manually"
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        ) : (
          <select
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setSubCategoryIds([]);
            }}
            className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
              validationErrors.category
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          >
            <option value="">
              Select category{fields?.suggested_category ? ` (suggested: ${fields.suggested_category})` : ""}
            </option>
            {categories.map((cat) => (
              <optgroup key={cat.id} label={cat.name}>
                <option value={cat.id}>{cat.name} (top-level)</option>
                {cat.children.map((sub) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        )}
        {validationErrors.category && (
          <p className="mt-0.5 text-xs text-red-600">{validationErrors.category}</p>
        )}
      </div>

      {/* Subcategories */}
      {selectedCategory && selectedCategory.children.length > 0 && (
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Subcategories (optional)
          </label>
          <div className="mt-1 flex flex-wrap gap-2">
            {selectedCategory.children.map((sub) => {
              const selected = subCategoryIds.includes(sub.id);
              return (
                <button
                  key={sub.id}
                  onClick={() =>
                    setSubCategoryIds((prev) =>
                      selected ? prev.filter((id) => id !== sub.id) : [...prev, sub.id]
                    )
                  }
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors ${
                    selected
                      ? "bg-blue-500 text-white"
                      : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  }`}
                >
                  {sub.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price, Currency, Locale, License */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-700">
            Download Price (0 = free)
          </label>
          <input
            type="number"
            min="0"
            step="0.01"
            value={downloadPrice}
            onChange={(e) => setDownloadPrice(e.target.value)}
            className={`mt-1 w-full rounded-lg border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 ${
              validationErrors.price
                ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                : "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {validationErrors.price && (
            <p className="mt-0.5 text-xs text-red-600">{validationErrors.price}</p>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Currency</label>
          <select
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">Locale</label>
          <select
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {LOCALES.map((l) => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700">
            License <span className="text-gray-400">(optional)</span>
          </label>
          {loadingLicenses ? (
            <p className="mt-1 text-xs text-gray-400">Loading...</p>
          ) : (
            <select
              value={licenseCode}
              onChange={(e) => setLicenseCode(e.target.value)}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">No license selected</option>
              {filteredLicenses.map((l) => (
                <option key={l.code} value={l.code}>{l.name}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isSubmitting || !isCults3DConnected}
        className="w-full rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50"
      >
        {isSubmitting ? "Creating listing..." : "Create Listing on Cults3D"}
      </button>

      {submitResult?.success && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-3">
          <p className="text-sm text-green-700">
            Design created successfully on Cults3D!
          </p>
          {submitResult.url && (
            <a
              href={submitResult.url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-sm font-medium text-green-600 hover:text-green-800"
            >
              View on Cults3D &rarr;
            </a>
          )}
        </div>
      )}

      {submitResult && !submitResult.success && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3">
          <p className="text-sm text-red-700">{submitResult.error}</p>
          {submitResult.apiErrors && submitResult.apiErrors.length > 0 && (
            <ul className="mt-1 list-inside list-disc text-xs text-red-600">
              {submitResult.apiErrors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
});

export default Cults3DListingForm;
