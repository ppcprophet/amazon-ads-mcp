#!/usr/bin/env node

/**
 * PPC Prophet MCP Server
 *
 * An MCP server for managing Amazon Advertising campaigns through natural language.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig, logInfo, logError } from './config.js';
import { ApiClient } from './api-client.js';
import { ProfilesResponse, CampaignsResponse, KeywordsResponse, PerformanceResponse, Profile, Campaign, Keyword, UpdateResponse, McpProfilesResponse, McpProfile, McpProfileStatusResponse, McpActivateResponse, McpFindProfileResponse, McpFindProfileError } from './types.js';

// Load configuration
const config = loadConfig();

// Initialize API client
const apiClient = new ApiClient(config);

/**
 * Helper: Resolve profile number to hash
 * Accepts either a number (#2, 2) or a hash string
 */
async function resolveProfileId(input: string | number): Promise<{ id: string; name: string; region: string } | null> {
  // If input looks like a number, look it up
  const num = typeof input === 'number' ? input : parseInt(String(input).replace('#', ''), 10);

  if (!isNaN(num)) {
    const response = await apiClient.get<McpProfilesResponse>('/v1/mcp/profiles');
    if (!response.success || !response.data) {
      return null;
    }
    const profile = response.data.profiles.find((p: McpProfile) => p.number === num);
    if (profile) {
      return { id: profile.id, name: profile.name, region: profile.region };
    }
  }

  // Assume it's already a hash
  return { id: String(input), name: '', region: '' };
}

/**
 * Context Management
 * Stores and retrieves the current working profile context
 */
interface ProfileContext {
  profileId: string;
  profileNumber: number;
  profileName: string;
  region: string;
  setAt: string;
}

const CONTEXT_DIR = path.join(os.homedir(), '.ppc-prophet');
const CONTEXT_FILE = path.join(CONTEXT_DIR, 'context.json');

function ensureContextDir(): void {
  if (!fs.existsSync(CONTEXT_DIR)) {
    fs.mkdirSync(CONTEXT_DIR, { recursive: true });
  }
}

function readContext(): ProfileContext | null {
  try {
    if (!fs.existsSync(CONTEXT_FILE)) {
      return null;
    }
    const data = fs.readFileSync(CONTEXT_FILE, 'utf-8');
    return JSON.parse(data) as ProfileContext;
  } catch (error) {
    logError('Failed to read context file', error);
    return null;
  }
}

function writeContext(context: ProfileContext): void {
  try {
    ensureContextDir();
    fs.writeFileSync(CONTEXT_FILE, JSON.stringify(context, null, 2), 'utf-8');
    logInfo(`Context updated: ${context.profileName}`);
  } catch (error) {
    logError('Failed to write context file', error);
  }
}

function clearContext(): void {
  try {
    if (fs.existsSync(CONTEXT_FILE)) {
      fs.unlinkSync(CONTEXT_FILE);
      logInfo('Context cleared');
    }
  } catch (error) {
    logError('Failed to clear context file', error);
  }
}

// Initialize MCP server
const server = new Server(
  {
    name: 'ppc-prophet',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
      resources: {},
      prompts: {},
    },
  }
);

// Define all tools
const tools = [
  {
    name: 'list_profiles',
    description: 'List all Amazon advertising profiles for the authenticated user. Returns profile IDs that can be used in other commands.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_profile',
    description: 'Get detailed information about a specific Amazon advertising profile',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash) to retrieve',
        },
      },
      required: ['profile_id'],
    },
  },
  {
    name: 'list_campaigns',
    description: 'List Amazon advertising campaigns for a specific profile',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash) to list campaigns for',
        },
        status: {
          type: 'string',
          enum: ['enabled', 'paused', 'archived'],
          description: 'Filter by campaign status',
        },
        targeting_type: {
          type: 'string',
          enum: ['auto', 'manual'],
          description: 'Filter by targeting type',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of campaigns to return (default 100)',
        },
      },
      required: ['profile_id'],
    },
  },
  {
    name: 'get_campaign',
    description: 'Get detailed information about a specific campaign',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash)',
        },
        campaign_id: {
          type: 'string',
          description: 'The campaign ID (hash) to retrieve',
        },
      },
      required: ['profile_id', 'campaign_id'],
    },
  },
  {
    name: 'update_campaign_status',
    description: 'Update the status of a campaign (pause, enable, or archive)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash)',
        },
        campaign_id: {
          type: 'string',
          description: 'The campaign ID (hash) to update',
        },
        status: {
          type: 'string',
          enum: ['enabled', 'paused', 'archived'],
          description: 'The new status for the campaign',
        },
      },
      required: ['profile_id', 'campaign_id', 'status'],
    },
  },
  {
    name: 'update_campaign_budget',
    description: 'Update the daily budget of a campaign',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash)',
        },
        campaign_id: {
          type: 'string',
          description: 'The campaign ID (hash) to update',
        },
        budget: {
          type: 'number',
          description: 'The new daily budget in dollars',
        },
      },
      required: ['profile_id', 'campaign_id', 'budget'],
    },
  },
  {
    name: 'search_campaigns',
    description: 'Search for campaigns by name',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash)',
        },
        query: {
          type: 'string',
          description: 'Search query (campaign name)',
        },
      },
      required: ['profile_id', 'query'],
    },
  },
  {
    name: 'list_keywords',
    description: 'List keywords for a profile or campaign',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash)',
        },
        campaign_id: {
          type: 'string',
          description: 'Optional: filter by specific campaign ID',
        },
        status: {
          type: 'string',
          enum: ['enabled', 'paused', 'archived'],
          description: 'Filter by keyword status',
        },
        match_type: {
          type: 'string',
          enum: ['exact', 'phrase', 'broad', 'negativeExact', 'negativePhrase'],
          description: 'Filter by match type',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of keywords to return',
        },
      },
      required: ['profile_id'],
    },
  },
  {
    name: 'update_keyword_bid',
    description: 'Update the bid amount for a keyword',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash)',
        },
        keyword_id: {
          type: 'string',
          description: 'The keyword ID (hash) to update',
        },
        bid: {
          type: 'number',
          description: 'The new bid amount in dollars (min $0.02, max $1000)',
        },
      },
      required: ['profile_id', 'keyword_id', 'bid'],
    },
  },
  {
    name: 'update_keyword_status',
    description: 'Update the status of a keyword (pause, enable, or archive)',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash)',
        },
        keyword_id: {
          type: 'string',
          description: 'The keyword ID (hash) to update',
        },
        status: {
          type: 'string',
          enum: ['enabled', 'paused', 'archived'],
          description: 'The new status for the keyword',
        },
      },
      required: ['profile_id', 'keyword_id', 'status'],
    },
  },
  {
    name: 'get_performance',
    description: 'Get performance metrics for campaigns in a date range',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash)',
        },
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
      },
      required: ['profile_id', 'start_date', 'end_date'],
    },
  },
  {
    name: 'get_campaign_performance',
    description: 'Get individual campaign performance metrics with flexible sorting and filtering. Perfect for queries like "show me top 10 campaigns by ROAS" or "which campaigns have highest ACOS".',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile ID (hash or number)',
        },
        start_date: {
          type: 'string',
          description: 'Start date in YYYY-MM-DD format',
        },
        end_date: {
          type: 'string',
          description: 'End date in YYYY-MM-DD format',
        },
        sort_by: {
          type: 'string',
          enum: ['sales', 'spend', 'roas', 'acos', 'clicks', 'impressions', 'ctr', 'cpc', 'conversions'],
          description: 'Metric to sort by (default: sales)',
        },
        order: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort direction (default: desc)',
        },
        limit: {
          type: 'number',
          description: 'Number of campaigns to return (default: 10, max: 500)',
        },
        status: {
          type: 'string',
          enum: ['enabled', 'paused', 'archived'],
          description: 'Filter by campaign status (optional)',
        },
      },
      required: ['profile_id', 'start_date', 'end_date'],
    },
  },
  // MCP Profile Management Tools
  {
    name: 'list_mcp_profiles',
    description: 'List all Amazon advertising profiles with their MCP activation status. Shows which profiles are ready for querying, which need activation, and which are currently importing data.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
      required: [],
    },
  },
  {
    name: 'activate_mcp_profile',
    description: 'Activate an Amazon advertising profile for MCP access. Use the number from list_profiles (e.g., #2 or 2).',
    inputSchema: {
      type: 'object' as const,
      properties: {
        number: {
          type: 'number',
          description: 'The profile number from list_profiles (e.g., 2 for #2)',
        },
      },
      required: ['number'],
    },
  },
  {
    name: 'check_mcp_status',
    description: 'Check the MCP data import status for a specific profile by number.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        number: {
          type: 'number',
          description: 'The profile number from list_profiles',
        },
      },
      required: ['number'],
    },
  },
  {
    name: 'deactivate_mcp_profile',
    description: 'Deactivate an Amazon advertising profile from MCP access by number.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        number: {
          type: 'number',
          description: 'The profile number from list_profiles',
        },
      },
      required: ['number'],
    },
  },
  {
    name: 'set_current_profile',
    description: 'Set the current working profile context. This profile will be used automatically for all subsequent campaign, keyword, and performance queries.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        profile_id: {
          type: 'string',
          description: 'The profile number (e.g., "2", "#2") or hash to set as current',
        },
      },
      required: ['profile_id'],
    },
  },
];

// Handle list tools request
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case 'list_profiles': {
        const response = await apiClient.get<ProfilesResponse>('/v1/amazon/profiles');
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch profiles'}` }] };
        }
        const profiles = response.data.profiles;
        if (profiles.length === 0) {
          return { content: [{ type: 'text', text: 'No Amazon advertising profiles found.' }] };
        }
        // Clean numbered list - user can say "activate #2" and tool looks up the hash
        const formatted = profiles.map((p: Profile & { number?: number; region?: string }) =>
          `#${p.number}. ${p.name} (${p.region || p.marketplace || 'US'})`
        ).join('\n');
        return { content: [{ type: 'text', text: `Found ${profiles.length} profile(s):\n\n${formatted}\n\nTo activate a profile, just say "activate #2" or similar.` }] };
      }

      case 'get_profile': {
        const profileId = args?.profile_id as string;
        const response = await apiClient.get<Profile>(`/v1/amazon/profiles/${profileId}`);
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Profile not found'}` }] };
        }
        const p = response.data;
        return { content: [{ type: 'text', text: `**${p.name}**\nID: ${p.profile_id}\nMarketplace: ${p.marketplace}\nType: ${p.type}\nStatus: ${p.status}` }] };
      }

      case 'list_campaigns': {
        // Resolve profile_id (accepts number like #2 or hash)
        const resolved = await resolveProfileId(args?.profile_id as string);
        if (!resolved) {
          return { content: [{ type: 'text', text: 'Error: Could not resolve profile. Use list_profiles to see available profiles.' }] };
        }

        const params: Record<string, string> = { profile_id: resolved.id };
        if (args?.status) params.status = args.status as string;
        if (args?.targeting_type) params.targeting_type = args.targeting_type as string;
        if (args?.limit) params.limit = String(args.limit);

        const response = await apiClient.get<CampaignsResponse>('/v1/amazon/campaigns', params);
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch campaigns'}` }] };
        }
        const campaigns = response.data.campaigns;
        if (campaigns.length === 0) {
          return { content: [{ type: 'text', text: 'No campaigns found.' }] };
        }
        const formatted = campaigns.map((c: Campaign) =>
          `- **${c.name}** (ID: ${c.id})\n  Status: ${c.state} | Budget: $${c.daily_budget}/day | Type: ${c.targeting_type}`
        ).join('\n\n');
        return { content: [{ type: 'text', text: `Found ${campaigns.length} campaign(s):\n\n${formatted}` }] };
      }

      case 'get_campaign': {
        const response = await apiClient.get<Campaign>(`/v1/amazon/campaigns/${args?.campaign_id}`, { profile_id: args?.profile_id as string });
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Campaign not found'}` }] };
        }
        const c = response.data;
        return { content: [{ type: 'text', text: `**${c.name}**\nID: ${c.id}\nStatus: ${c.state}\nBudget: $${c.daily_budget}/day\nTargeting: ${c.targeting_type}` }] };
      }

      case 'update_campaign_status': {
        const response = await apiClient.patch<UpdateResponse>(`/v1/amazon/campaigns/${args?.campaign_id}/status`, {
          profile_id: args?.profile_id,
          status: args?.status,
        });
        if (!response.success) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to update status'}` }] };
        }
        return { content: [{ type: 'text', text: response.message || `Campaign status updated to ${args?.status}` }] };
      }

      case 'update_campaign_budget': {
        const response = await apiClient.patch<UpdateResponse>(`/v1/amazon/campaigns/${args?.campaign_id}/budget`, {
          profile_id: args?.profile_id,
          budget: args?.budget,
        });
        if (!response.success) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to update budget'}` }] };
        }
        return { content: [{ type: 'text', text: response.message || `Campaign budget updated to $${args?.budget}/day` }] };
      }

      case 'search_campaigns': {
        const response = await apiClient.get<CampaignsResponse>('/v1/amazon/campaigns/search', {
          profile_id: args?.profile_id as string,
          q: args?.query as string,
        });
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Search failed'}` }] };
        }
        const campaigns = response.data.campaigns;
        if (campaigns.length === 0) {
          return { content: [{ type: 'text', text: `No campaigns found matching "${args?.query}"` }] };
        }
        const formatted = campaigns.map((c: Campaign) => `- **${c.name}** (${c.state}) - $${c.daily_budget}/day`).join('\n');
        return { content: [{ type: 'text', text: `Found ${campaigns.length} campaign(s):\n\n${formatted}` }] };
      }

      case 'list_keywords': {
        const params: Record<string, string> = { profile_id: args?.profile_id as string };
        if (args?.campaign_id) params.campaign_id = args.campaign_id as string;
        if (args?.status) params.status = args.status as string;
        if (args?.match_type) params.match_type = args.match_type as string;
        if (args?.limit) params.limit = String(args.limit);

        const response = await apiClient.get<KeywordsResponse>('/v1/amazon/keywords', params);
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch keywords'}` }] };
        }
        const keywords = response.data.keywords;
        if (keywords.length === 0) {
          return { content: [{ type: 'text', text: 'No keywords found.' }] };
        }
        const formatted = keywords.map((k: Keyword) =>
          `- **${k.keyword}** (ID: ${k.id})\n  Match: ${k.match_type} | Status: ${k.state} | Bid: $${k.bid}`
        ).join('\n\n');
        return { content: [{ type: 'text', text: `Found ${keywords.length} keyword(s):\n\n${formatted}` }] };
      }

      case 'update_keyword_bid': {
        const response = await apiClient.patch<UpdateResponse>(`/v1/amazon/keywords/${args?.keyword_id}/bid`, {
          profile_id: args?.profile_id,
          bid: args?.bid,
        });
        if (!response.success) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to update bid'}` }] };
        }
        return { content: [{ type: 'text', text: response.message || `Keyword bid updated to $${args?.bid}` }] };
      }

      case 'update_keyword_status': {
        const response = await apiClient.patch<UpdateResponse>(`/v1/amazon/keywords/${args?.keyword_id}/status`, {
          profile_id: args?.profile_id,
          status: args?.status,
        });
        if (!response.success) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to update status'}` }] };
        }
        return { content: [{ type: 'text', text: response.message || `Keyword status updated to ${args?.status}` }] };
      }

      case 'get_performance': {
        const response = await apiClient.get<PerformanceResponse>('/v1/amazon/reports/performance', {
          profile_id: args?.profile_id as string,
          start_date: args?.start_date as string,
          end_date: args?.end_date as string,
        });
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch performance'}` }] };
        }
        const data = response.data;

        // Aggregate metrics across all campaigns
        let totalImpressions = 0;
        let totalClicks = 0;
        let totalSpend = 0;
        let totalSales = 0;

        data.campaigns.forEach((c: Campaign) => {
          if (c.metrics) {
            totalImpressions += c.metrics.impressions || 0;
            totalClicks += c.metrics.clicks || 0;
            totalSpend += c.metrics.spend || 0;
            totalSales += c.metrics.sales || 0;
          }
        });

        const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : '0.00';
        const acos = totalSales > 0 ? ((totalSpend / totalSales) * 100).toFixed(2) : '0.00';
        const roas = totalSpend > 0 ? (totalSales / totalSpend).toFixed(2) : '0.00';

        let text = `**Performance Summary (${args?.start_date} to ${args?.end_date})**\n\n`;
        text += `📊 **Overview:**\n`;
        text += `- Campaigns: ${data.count}\n`;
        text += `- Impressions: ${totalImpressions.toLocaleString()}\n`;
        text += `- Clicks: ${totalClicks.toLocaleString()}\n`;
        text += `- CTR: ${ctr}%\n\n`;

        text += `💰 **Financial:**\n`;
        text += `- Spend: $${totalSpend.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        text += `- Sales: $${totalSales.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}\n`;
        text += `- ACOS: ${acos}%\n`;
        text += `- ROAS: ${roas}x\n\n`;

        // Show top performing campaigns
        const campaignsWithMetrics = data.campaigns.filter((c: Campaign) => c.metrics);
        if (campaignsWithMetrics.length > 0) {
          const topCampaigns = campaignsWithMetrics
            .sort((a: Campaign, b: Campaign) => (b.metrics?.sales || 0) - (a.metrics?.sales || 0))
            .slice(0, 5);

          text += `🏆 **Top 5 Campaigns by Sales:**\n`;
          topCampaigns.forEach((c: Campaign, i: number) => {
            const m = c.metrics!;
            text += `${i + 1}. **${c.name}**\n`;
            text += `   Sales: $${(m.sales || 0).toLocaleString()} | Spend: $${(m.spend || 0).toLocaleString()} | ACOS: ${((m.spend / m.sales) * 100).toFixed(1)}%\n`;
          });
        }

        return { content: [{ type: 'text', text }] };
      }

      case 'get_campaign_performance': {
        const params: Record<string, string> = {
          profile_id: args?.profile_id as string,
          start_date: args?.start_date as string,
          end_date: args?.end_date as string,
        };

        if (args?.sort_by) params.sort_by = args.sort_by as string;
        if (args?.order) params.order = args.order as string;
        if (args?.limit) params.limit = String(args.limit);
        if (args?.status) params.status = args.status as string;

        const response = await apiClient.get<PerformanceResponse>('/v1/amazon/reports/campaign-performance', params);
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch campaign performance'}` }] };
        }

        const data = response.data;
        const campaigns = data.campaigns;

        if (campaigns.length === 0) {
          return { content: [{ type: 'text', text: `No campaigns found for the specified criteria.` }] };
        }

        const sortBy = params.sort_by || 'sales';
        const order = params.order || 'desc';
        const statusFilter = params.status ? ` (${params.status} only)` : '';

        let text = `**Top Campaigns by ${sortBy.toUpperCase()}** (${args?.start_date} to ${args?.end_date})${statusFilter}\n\n`;

        campaigns.forEach((c: Campaign, i: number) => {
          const m = c.metrics;
          if (!m) return;

          text += `${i + 1}. **${c.name}**\n`;
          text += `   Status: ${c.state} | Type: ${c.targeting_type || 'N/A'}\n`;
          text += `   📊 Impressions: ${m.impressions?.toLocaleString()} | Clicks: ${m.clicks?.toLocaleString()} | CTR: ${m.ctr}%\n`;
          text += `   💰 Spend: $${m.spend?.toLocaleString()} | Sales: $${m.sales?.toLocaleString()}\n`;
          text += `   📈 ACOS: ${m.acos}% | ROAS: ${m.roas}x | CPC: $${m.cpc}\n\n`;
        });

        text += `\n**Total:** ${campaigns.length} campaign(s) | Sorted by: ${sortBy} (${order})`;

        return { content: [{ type: 'text', text }] };
      }

      // MCP Profile Management
      case 'list_mcp_profiles': {
        const response = await apiClient.get<McpProfilesResponse>('/v1/mcp/profiles');
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch profiles'}` }] };
        }
        const profiles = response.data.profiles;
        if (profiles.length === 0) {
          return { content: [{ type: 'text', text: 'No Amazon advertising profiles found for this account.' }] };
        }

        // Group profiles by status
        const ready = profiles.filter((p: McpProfile) => p.is_ready);
        const importing = profiles.filter((p: McpProfile) => p.mcp_activated && !p.is_ready);
        const notActivated = profiles.filter((p: McpProfile) => !p.mcp_activated);

        let text = `Found ${profiles.length} profile(s):\n\n`;

        if (ready.length > 0) {
          text += `**Ready for Queries (${ready.length}):**\n`;
          ready.forEach((p: McpProfile) => {
            text += `#${p.number}. ${p.name} (${p.region})\n`;
          });
          text += '\n';
        }

        if (importing.length > 0) {
          text += `**Importing Data (${importing.length}):**\n`;
          importing.forEach((p: McpProfile) => {
            const eta = p.estimated_minutes ? ` - ~${p.estimated_minutes} min remaining` : '';
            text += `#${p.number}. ${p.name} (${p.region}) - ${p.mcp_data_status}${eta}\n`;
          });
          text += '\n';
        }

        if (notActivated.length > 0) {
          text += `**Not Activated (${notActivated.length}):**\n`;
          notActivated.forEach((p: McpProfile) => {
            text += `#${p.number}. ${p.name} (${p.region})\n`;
          });
          text += '\n';
        }

        text += `To activate: say "activate #2" or similar.`;

        return { content: [{ type: 'text', text }] };
      }

      case 'activate_mcp_profile': {
        const profileNumber = args?.number as number;

        // First, get the profiles list to find the hash by number
        const listResponse = await apiClient.get<McpProfilesResponse>('/v1/mcp/profiles');
        if (!listResponse.success || !listResponse.data) {
          return { content: [{ type: 'text', text: `Error: ${listResponse.error || 'Failed to fetch profiles'}` }] };
        }

        const profile = listResponse.data.profiles.find((p: McpProfile) => p.number === profileNumber);
        if (!profile) {
          return { content: [{ type: 'text', text: `Error: Profile #${profileNumber} not found. Use list_profiles to see available profiles.` }] };
        }

        const response = await apiClient.post<McpActivateResponse>('/v1/mcp/profiles/activate', {
          profile_id: profile.id,
        });

        if (!response.success) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to activate profile'}` }] };
        }

        const data = response.data;
        let text = `**Profile Activated for MCP Access**\n\n`;
        text += `Profile: ${profile.name} (${profile.region})\n`;
        text += `Status: ${data?.status || 'pending'}\n`;
        if (data?.estimated_minutes) {
          text += `Estimated time: ~${data.estimated_minutes} minutes\n`;
        }
        text += `\nData import has started. Use \`check_mcp_status\` to monitor progress.`;
        return { content: [{ type: 'text', text }] };
      }

      case 'check_mcp_status': {
        const profileNumber = args?.number as number;

        // First, get the profiles list to find the hash by number
        const listResponse = await apiClient.get<McpProfilesResponse>('/v1/mcp/profiles');
        if (!listResponse.success || !listResponse.data) {
          return { content: [{ type: 'text', text: `Error: ${listResponse.error || 'Failed to fetch profiles'}` }] };
        }

        const profile = listResponse.data.profiles.find((p: McpProfile) => p.number === profileNumber);
        if (!profile) {
          return { content: [{ type: 'text', text: `Error: Profile #${profileNumber} not found.` }] };
        }

        const response = await apiClient.get<McpProfileStatusResponse>(`/v1/mcp/profiles/${profile.id}/status`);
        if (!response.success || !response.data) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to get status'}` }] };
        }

        const status = response.data;
        let text = `**MCP Status: ${profile.name} (${profile.region})**\n\n`;
        text += `Available: ${status.available ? 'Yes' : 'No'}\n`;
        text += `Status: ${status.reason}\n`;
        text += `Message: ${status.message}\n`;
        if (status.estimated_minutes) {
          text += `Estimated time remaining: ~${status.estimated_minutes} minutes\n`;
        }
        if (status.import_progress) {
          text += `\n**Import Progress:**\n`;
          text += `- Days imported: ${status.import_progress.unique_dates} / ${status.import_progress.expected_days}\n`;
          text += `- Progress: ${status.import_progress.progress_percent}%\n`;
        }
        if (status.available) {
          text += `\nThis profile is ready! You can now query campaigns, keywords, and performance data.`;
        }
        return { content: [{ type: 'text', text }] };
      }

      case 'deactivate_mcp_profile': {
        const profileNumber = args?.number as number;

        // First, get the profiles list to find the hash by number
        const listResponse = await apiClient.get<McpProfilesResponse>('/v1/mcp/profiles');
        if (!listResponse.success || !listResponse.data) {
          return { content: [{ type: 'text', text: `Error: ${listResponse.error || 'Failed to fetch profiles'}` }] };
        }

        const profile = listResponse.data.profiles.find((p: McpProfile) => p.number === profileNumber);
        if (!profile) {
          return { content: [{ type: 'text', text: `Error: Profile #${profileNumber} not found.` }] };
        }

        const response = await apiClient.post<{ message: string }>('/v1/mcp/profiles/deactivate', {
          profile_id: profile.id,
        });

        if (!response.success) {
          return { content: [{ type: 'text', text: `Error: ${response.error || 'Failed to deactivate profile'}` }] };
        }
        return { content: [{ type: 'text', text: `**${profile.name} (${profile.region})** deactivated from MCP access.` }] };
      }

      case 'set_current_profile': {
        const profileInput = args?.profile_id as string;

        // Resolve profile (could be number or hash)
        const resolved = await resolveProfileId(profileInput);
        if (!resolved) {
          return { content: [{ type: 'text', text: `Error: Could not resolve profile "${profileInput}"` }] };
        }

        // Get full profile details from the API
        const listResponse = await apiClient.get<McpProfilesResponse>('/v1/mcp/profiles');
        if (!listResponse.success || !listResponse.data) {
          return { content: [{ type: 'text', text: 'Error: Failed to fetch profile list' }] };
        }

        const profile = listResponse.data.profiles.find((p: McpProfile) => p.id === resolved.id);
        if (!profile) {
          return { content: [{ type: 'text', text: `Error: Profile not found in your account` }] };
        }

        // Check if profile is activated and ready
        if (!profile.mcp_activated) {
          return {
            content: [{
              type: 'text',
              text: `Error: Profile **${profile.name}** (#${profile.number}) is not activated for MCP access.\n\nPlease activate it first using: activate_mcp_profile`
            }]
          };
        }

        if (profile.mcp_data_status !== 'ready') {
          return {
            content: [{
              type: 'text',
              text: `Warning: Profile **${profile.name}** (#${profile.number}) is activated but data is still importing (status: ${profile.mcp_data_status}).\n\nYou can set it as current, but queries may return limited data until import completes.`
            }]
          };
        }

        // Save context
        const context: ProfileContext = {
          profileId: profile.id,
          profileNumber: profile.number,
          profileName: profile.name,
          region: profile.region,
          setAt: new Date().toISOString(),
        };

        writeContext(context);

        return {
          content: [{
            type: 'text',
            text: `✓ Current working profile set to: **${profile.name}** (#${profile.number}) - ${profile.region}\n\nAll subsequent commands will use this profile automatically.`
          }]
        };
      }

      default:
        return { content: [{ type: 'text', text: `Unknown tool: ${name}` }] };
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return { content: [{ type: 'text', text: `Error: ${msg}` }] };
  }
});

// Handle list resources request
server.setRequestHandler(ListResourcesRequestSchema, async () => {
  return {
    resources: [
      {
        uri: 'ppc://help',
        name: 'PPC Prophet Help',
        description: 'Help and usage information',
        mimeType: 'text/plain',
      },
      {
        uri: 'ppc://context',
        name: 'Current Working Profile',
        description: 'The currently selected Amazon Ads profile context. Read this to see which profile is active.',
        mimeType: 'application/json',
      },
    ],
  };
});

// Handle read resource request
server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri === 'ppc://help') {
    return {
      contents: [
        {
          uri: 'ppc://help',
          mimeType: 'text/plain',
          text: `PPC Prophet MCP Server - Amazon Ads Management

Available Tools:

**MCP Profile Management (start here):**
- list_mcp_profiles: List all profiles with activation status
- activate_mcp_profile: Activate a profile for MCP access
- check_mcp_status: Check data import status
- deactivate_mcp_profile: Remove profile from MCP access

**Profile & Campaign Management:**
- list_profiles: List your Amazon ad profiles
- list_campaigns: List campaigns for a profile
- update_campaign_status: Pause/enable campaigns
- update_campaign_budget: Change campaign budgets
- list_keywords: List keywords
- update_keyword_bid: Change keyword bids
- get_performance: Get performance metrics

Getting Started:
1. Use list_mcp_profiles to see available profiles
2. Use activate_mcp_profile to enable a profile
3. Wait for data import (check with check_mcp_status)
4. Once ready, use other tools with profile_id`,
        },
      ],
    };
  }

  if (request.params.uri === 'ppc://context') {
    const context = readContext();

    if (!context) {
      return {
        contents: [
          {
            uri: 'ppc://context',
            mimeType: 'application/json',
            text: JSON.stringify({
              status: 'not_set',
              message: 'No working profile is currently set. Use set_current_profile to select a profile.',
            }, null, 2),
          },
        ],
      };
    }

    return {
      contents: [
        {
          uri: 'ppc://context',
          mimeType: 'application/json',
          text: JSON.stringify({
            status: 'active',
            profile: {
              id: context.profileId,
              number: context.profileNumber,
              name: context.profileName,
              region: context.region,
            },
            setAt: context.setAt,
            message: `Working with: ${context.profileName} (#${context.profileNumber})`,
          }, null, 2),
        },
      ],
    };
  }

  throw new Error(`Resource not found: ${request.params.uri}`);
});

// Handle list prompts request
server.setRequestHandler(ListPromptsRequestSchema, async () => {
  return {
    prompts: [
      {
        name: 'context-aware',
        description: 'Includes current working profile context in responses',
        arguments: [],
      },
    ],
  };
});

// Handle get prompt request
server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  if (request.params.name === 'context-aware') {
    const context = readContext();

    if (!context) {
      return {
        description: 'No profile context set',
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: `You are helping a user manage Amazon Advertising campaigns through PPC Prophet.

IMPORTANT: No working profile is currently set. When the user wants to work with a specific profile:
1. Ask them to list profiles first if needed
2. Help them set a current profile using the set_current_profile tool
3. Then proceed with their requests

Available commands:
- "list profiles" → shows all available profiles
- "work with profile #X" → sets profile #X as current working profile
- "work with [Profile Name]" → sets that profile as current`,
            },
          },
        ],
      };
    }

    return {
      description: `Current working profile: ${context.profileName} (#${context.profileNumber})`,
      messages: [
        {
          role: 'user',
          content: {
            type: 'text',
            text: `You are helping a user manage Amazon Advertising campaigns through PPC Prophet.

CURRENT WORKING PROFILE:
• Name: ${context.profileName}
• Region: ${context.region}
• Profile Number: #${context.profileNumber}
• Set at: ${new Date(context.setAt).toLocaleString()}

IMPORTANT: When the user makes requests about campaigns, keywords, or performance:
1. ALWAYS display the current profile context at the start of your response:
   Format: "[Working with: ${context.profileName} (#${context.profileNumber})]"

2. Automatically use profile_id="${context.profileNumber}" in all MCP tool calls unless they specify a different profile

3. If the user wants to switch profiles, use the set_current_profile tool

Examples:
- "show campaigns" → use list_campaigns with profile_id="${context.profileNumber}"
- "get performance for last 30 days" → use get_performance with profile_id="${context.profileNumber}"
- "work with profile #5" → use set_current_profile to switch context`,
          },
        },
      ],
    };
  }

  throw new Error(`Prompt not found: ${request.params.name}`);
});

// Main
async function main() {
  logInfo('Starting PPC Prophet MCP Server...');
  logInfo(`API URL: ${config.apiUrl}`);

  const transport = new StdioServerTransport();
  await server.connect(transport);

  logInfo('Server started');
}

main().catch((error) => {
  logError('Fatal error', error);
  process.exit(1);
});
