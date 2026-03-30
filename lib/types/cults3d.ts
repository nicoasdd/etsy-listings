export interface Cults3DCredentialStore {
  username?: string;
  apiKey?: string;
  nick?: string;
  verified?: boolean;
}

export interface Cults3DConnectionStatus {
  connected: boolean;
  nick?: string;
}

export interface GeneratedCults3DFields {
  name: string;
  description: string;
  tags: string[];
  suggested_category: string;
}

export interface Cults3DCategory {
  id: string;
  name: string;
  children: Cults3DCategory[];
}

export interface Cults3DLicense {
  code: string;
  name: string;
  url: string;
  availableOnFreeDesigns: boolean;
  availableOnPricedDesigns: boolean;
}

export interface UploadedFile {
  id: string;
  originalName: string;
  fileType: "image" | "model";
  size: number;
  status: "uploading" | "complete" | "error";
  progress?: number;
  url?: string;
  error?: string;
  previewUrl?: string;
}

export interface UploadFileResponse {
  success: boolean;
  url?: string;
  key?: string;
  error?: string;
}

export interface Cults3DCreateInput {
  name: string;
  description: string;
  tags?: string[];
  imageUrls: string[];
  fileUrls: string[];
  categoryId: string;
  subCategoryIds?: string[];
  downloadPrice: number;
  currency: string;
  locale: string;
  licenseCode?: string;
}

export interface Cults3DCreateResult {
  success: boolean;
  url?: string;
  error?: string;
  apiErrors?: string[];
}
