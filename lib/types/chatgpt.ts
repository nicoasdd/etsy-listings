export interface ChatGPTPendingOAuth {
  state: string;
  code_verifier: string;
}

export interface ChatGPTTokenStore {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  user_email?: string;
  pending_oauth?: ChatGPTPendingOAuth | null;
}

export interface ChatGPTConnectionStatus {
  connected: boolean;
  user_email?: string;
  expires_at?: number;
  needs_reauth: boolean;
  pending: boolean;
}

export interface TestPromptRequest {
  message: string;
  model?: string;
}

export interface TestPromptResponse {
  success: boolean;
  response: string;
  model: string;
  error?: string;
}

export interface GeneratedListingFields {
  title: string;
  description: string;
  tags: string[];
  materials: string[];
  styles: string[];
  suggested_category: string;
}

export interface GenerateListingResponse {
  success: boolean;
  fields?: GeneratedListingFields;
  model?: string;
  error?: string;
  needs_reauth?: boolean;
}
