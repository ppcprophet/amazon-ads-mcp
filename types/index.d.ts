/**
 * PPC Prophet MCP Server Type Definitions
 *
 * TypeScript type definitions for all API responses and data structures.
 */

export interface Profile {
  profile_id: string;
  seller_id: string;
  business_name: string;
  region: 'US' | 'EU' | 'CA' | 'AU' | 'JP';
  currency: string;
  timezone: string;
  marketplace_id: string;
  daily_budget?: number;
}

export interface MCPProfile {
  id: number;
  profile_id: number;
  data_status: 'pending' | 'retrieving' | 'importing' | 'ready' | 'error';
  activated_at: string | null;
  data_retrieved_at: string | null;
  data_imported_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface Campaign {
  campaign_id: string;
  profile_id: string;
  campaign_name: string;
  status: 'enabled' | 'paused' | 'archived';
  targeting_type: 'auto' | 'manual';
  daily_budget?: number;
  start_date: string;
  end_date?: string | null;
  premium_bid_adjustment?: boolean;
  bidding_strategy?: 'legacyForSales' | 'autoForSales' | 'manual';
  created_at: string;
  updated_at: string;
}

export interface CampaignPerformance {
  profile_id: string;
  campaign_id: string;
  campaign_name: string;
  status: 'enabled' | 'paused' | 'archived';
  targeting_type: 'auto' | 'manual';
  sales: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
}

export interface Keyword {
  keyword_id: string;
  campaign_id: string;
  ad_group_id: string;
  keyword_text: string;
  match_type: 'exact' | 'phrase' | 'broad' | 'negativeExact' | 'negativePhrase';
  status: 'enabled' | 'paused' | 'archived';
  bid: number;
  created_at: string;
  updated_at: string;
}

export interface KeywordPerformance extends Keyword {
  sales: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
}

export interface PerformanceMetrics {
  start_date: string;
  end_date: string;
  total_sales: number;
  total_spend: number;
  total_impressions: number;
  total_clicks: number;
  total_conversions: number;
  average_acos: number;
  average_roas: number;
  average_ctr: number;
  average_cpc: number;
  campaigns_count: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
}

// MCP Tool Parameter Types

export interface ListCampaignsParams {
  profile_id: string;
  status?: 'enabled' | 'paused' | 'archived';
  targeting_type?: 'auto' | 'manual';
  limit?: number;
}

export interface GetCampaignParams {
  profile_id: string;
  campaign_id: string;
}

export interface UpdateCampaignStatusParams {
  profile_id: string;
  campaign_id: string;
  status: 'enabled' | 'paused' | 'archived';
}

export interface UpdateCampaignBudgetParams {
  profile_id: string;
  campaign_id: string;
  budget: number;
}

export interface SearchCampaignsParams {
  profile_id: string;
  query: string;
}

export interface ListKeywordsParams {
  profile_id: string;
  campaign_id?: string;
  match_type?: 'exact' | 'phrase' | 'broad' | 'negativeExact' | 'negativePhrase';
  status?: 'enabled' | 'paused' | 'archived';
  limit?: number;
}

export interface UpdateKeywordBidParams {
  profile_id: string;
  keyword_id: string;
  bid: number;
}

export interface UpdateKeywordStatusParams {
  profile_id: string;
  keyword_id: string;
  status: 'enabled' | 'paused' | 'archived';
}

export interface GetPerformanceParams {
  profile_id: string;
  start_date: string; // YYYY-MM-DD format
  end_date: string; // YYYY-MM-DD format
}

export interface GetCampaignPerformanceParams {
  profile_id: string;
  start_date: string; // YYYY-MM-DD format
  end_date: string; // YYYY-MM-DD format
  sort_by?: 'sales' | 'spend' | 'roas' | 'acos' | 'clicks' | 'impressions' | 'ctr' | 'cpc' | 'conversions';
  order?: 'asc' | 'desc';
  limit?: number;
  status?: 'enabled' | 'paused' | 'archived';
}

export interface ActivateMcpProfileParams {
  number: number; // Profile number from list_profiles
}

export interface CheckMcpStatusParams {
  number: number; // Profile number from list_profiles
}

export interface DeactivateMcpProfileParams {
  number: number; // Profile number from list_profiles
}

export interface SetCurrentProfileParams {
  profile_id: string; // Profile number (e.g., "2", "#2") or hash
}
