export interface ListingPayload {
  quantity: number;
  title: string;
  description: string;
  price: number;
  who_made: WhoMade;
  when_made: WhenMade;
  taxonomy_id: number;

  shipping_profile_id?: number;
  return_policy_id?: number;
  materials?: string[];
  shop_section_id?: number;
  processing_min?: number;
  processing_max?: number;
  tags?: string[];
  styles?: string[];
  item_weight?: number;
  item_length?: number;
  item_width?: number;
  item_height?: number;
  item_weight_unit?: "oz" | "g" | "kg" | "lb";
  item_dimensions_unit?: "in" | "ft" | "mm" | "cm" | "m" | "yd";
  is_personalizable?: boolean;
  personalization_is_required?: boolean;
  personalization_char_count_max?: number;
  personalization_instructions?: string;
  production_partner_ids?: number[];
  image_ids?: number[];
  is_supply?: boolean;
  is_customizable?: boolean;
  should_auto_renew?: boolean;
  is_taxable?: boolean;
  type?: "physical" | "download";
}

export type WhoMade = "i_did" | "someone_else" | "collective";

export type WhenMade =
  | "made_to_order"
  | "2020_2023"
  | "2010_2019"
  | "2004_2009"
  | "before_2004"
  | "2000_2003"
  | "1990s"
  | "1980s"
  | "1970s"
  | "1960s"
  | "1950s"
  | "1940s"
  | "1930s"
  | "1920s"
  | "1910s"
  | "1900s"
  | "1800s"
  | "1700s"
  | "before_1700";

export interface EtsyTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
  refresh_token: string;
}

export interface EtsyShopResponse {
  count: number;
  results: EtsyShop[];
}

export interface EtsyShop {
  shop_id: number;
  shop_name: string;
  user_id: number;
}

export interface EtsyListingResponse {
  listing_id: number;
  title: string;
  state: string;
  url: string;
}

export interface EtsyErrorResponse {
  error: string;
  error_description?: string;
}
