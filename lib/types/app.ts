export interface PendingOAuth {
  state: string;
  code_verifier: string;
}

export interface TokenStore {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user_id?: number;
  shop_id?: number;
  shop_name?: string;
  pending_oauth?: PendingOAuth | null;
}

export interface UploadResult {
  index: number;
  title: string;
  status: "success" | "error";
  listing_id?: number;
  listing_url?: string;
  error?: string;
  etsy_errors?: Record<string, unknown>[];
}

export interface UploadResponse {
  results: UploadResult[];
  summary: {
    total: number;
    succeeded: number;
    failed: number;
  };
}

export interface ConnectionStatus {
  connected: boolean;
  shop_name?: string;
  shop_id?: number;
  expires_at?: number;
  needs_reauth: boolean;
}

export interface ValidationError {
  index: number;
  title: string;
  errors: string[];
}
