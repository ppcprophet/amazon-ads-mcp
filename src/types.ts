/**
 * TypeScript interfaces for API responses
 */

export interface Profile {
  profile_id: string;
  name: string;
  marketplace: string;
  seller_id?: string;
  type: string;
  status: string;
  created_at?: string;
}

export interface Campaign {
  id: string;
  campaign_id: string;
  profile_id: string;
  name: string;
  state: string;
  daily_budget: number;
  targeting_type: string;
  campaign_type?: string;
  start_date?: string;
  end_date?: string;
  created_at?: string;
  updated_at?: string;
  metrics?: CampaignMetrics;
}

export interface CampaignMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  conversions: number;
  acos: number;
  roas: number;
  ctr: number;
  cpc: number;
}

export interface Keyword {
  id: string;
  keyword_id: string;
  keyword: string;
  match_type: string;
  state: string;
  bid: number;
  campaign_id: string;
  adgroup_id: string;
  created_at?: string;
  updated_at?: string;
  metrics?: KeywordMetrics;
}

export interface KeywordMetrics {
  impressions: number;
  clicks: number;
  spend: number;
  sales: number;
  acos: number;
  ctr: number;
  cpc: number;
}

export interface ProfilesResponse {
  profiles: Profile[];
  count: number;
}

export interface CampaignsResponse {
  campaigns: Campaign[];
  count: number;
  profile_id: string;
}

export interface KeywordsResponse {
  keywords: Keyword[];
  count: number;
  profile_id: string;
}

export interface PerformanceResponse {
  campaigns: Campaign[];
  count: number;
  profile_id: string;
  date_range: {
    start: string;
    end: string;
  };
}

export interface UpdateResponse {
  campaign?: Campaign;
  keyword?: Keyword;
  changes: Record<string, { from: unknown; to: unknown }>;
}

// MCP Profile types (for profile activation/status management)
export interface McpProfile {
  number: number;  // User-friendly number (1, 2, 3...)
  id: string;  // hash (hidden from user, used internally)
  name: string;
  region: string;  // US, CA, UK, DE, etc.
  mcp_activated: boolean;
  mcp_data_status?: 'pending' | 'retrieving' | 'importing' | 'ready' | 'error' | null;
  is_ready: boolean;
  message?: string;
  estimated_minutes?: number | null;
  activated_at?: string | null;
  data_indexed_at?: string | null;
}

export interface McpFindProfileResponse {
  id: string;
  name: string;
  region: string;
}

export interface McpFindProfileError {
  error: string;
  message?: string;
  matches?: Array<{ id: string; name: string; region: string }>;
}

export interface McpProfilesResponse {
  profiles: McpProfile[];
  count: number;
}

export interface McpProfileStatusResponse {
  available: boolean;
  reason: 'not_activated' | 'pending' | 'retrieving' | 'importing' | 'ready' | 'error';
  message: string;
  estimated_minutes?: number | null;
  profile_id?: string;
  activated_at?: string;
  data_status?: string;
  import_progress?: {
    unique_dates: number;
    expected_days: number;
    progress_percent: number;
  };
}

export interface McpActivateResponse {
  profile_id: string;
  status: string;
  estimated_minutes?: number;
}
