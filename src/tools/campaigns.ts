/**
 * Campaign management tools
 */

import { z } from 'zod';
import { ApiClient } from '../api-client.js';
import { CampaignsResponse, Campaign, UpdateResponse } from '../types.js';

export function registerCampaignTools(
  server: {
    tool: (
      name: string,
      schema: { description: string; inputSchema: z.ZodObject<z.ZodRawShape> },
      handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
    ) => void;
  },
  apiClient: ApiClient
) {
  // List campaigns
  server.tool(
    'list_campaigns',
    {
      description: 'List Amazon advertising campaigns for a specific profile',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash) to list campaigns for'),
        status: z.enum(['enabled', 'paused', 'archived']).optional().describe('Filter by campaign status'),
        targeting_type: z.enum(['auto', 'manual']).optional().describe('Filter by targeting type'),
        limit: z.number().min(1).max(500).optional().describe('Maximum number of campaigns to return'),
      }),
    },
    async (args) => {
      const params: Record<string, string> = {
        profile_id: args.profile_id as string,
      };

      if (args.status) params.status = args.status as string;
      if (args.targeting_type) params.targeting_type = args.targeting_type as string;
      if (args.limit) params.limit = String(args.limit);

      const response = await apiClient.get<CampaignsResponse>('/v1/amazon/campaigns', params);

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch campaigns'}` }],
        };
      }

      const campaigns = response.data.campaigns;

      if (campaigns.length === 0) {
        return {
          content: [{ type: 'text', text: 'No campaigns found matching your criteria.' }],
        };
      }

      const formatted = campaigns.map((c: Campaign) =>
        `- **${c.name}** (ID: ${c.id})
  Status: ${c.state} | Budget: $${c.daily_budget}/day | Type: ${c.targeting_type}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${campaigns.length} campaign(s):\n\n${formatted}`,
        }],
      };
    }
  );

  // Get single campaign
  server.tool(
    'get_campaign',
    {
      description: 'Get detailed information about a specific campaign',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash)'),
        campaign_id: z.string().describe('The campaign ID (hash) to retrieve'),
      }),
    },
    async (args) => {
      const response = await apiClient.get<{ data: Campaign }>(
        `/v1/amazon/campaigns/${args.campaign_id}`,
        { profile_id: args.profile_id as string }
      );

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Campaign not found'}` }],
        };
      }

      const campaign = response.data as unknown as Campaign;
      const text = `**Campaign: ${campaign.name}**
- Campaign ID: ${campaign.id}
- Status: ${campaign.state}
- Daily Budget: $${campaign.daily_budget}
- Targeting Type: ${campaign.targeting_type}
- Campaign Type: ${campaign.campaign_type || 'N/A'}
- Start Date: ${campaign.start_date || 'N/A'}
- End Date: ${campaign.end_date || 'N/A'}`;

      return {
        content: [{ type: 'text', text }],
      };
    }
  );

  // Update campaign status
  server.tool(
    'update_campaign_status',
    {
      description: 'Update the status of a campaign (pause, enable, or archive)',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash)'),
        campaign_id: z.string().describe('The campaign ID (hash) to update'),
        status: z.enum(['enabled', 'paused', 'archived']).describe('The new status for the campaign'),
      }),
    },
    async (args) => {
      const response = await apiClient.patch<UpdateResponse>(
        `/v1/amazon/campaigns/${args.campaign_id}/status`,
        {
          profile_id: args.profile_id,
          status: args.status,
        }
      );

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to update campaign status'}` }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: response.message || `Campaign status updated to ${args.status}`,
        }],
      };
    }
  );

  // Update campaign budget
  server.tool(
    'update_campaign_budget',
    {
      description: 'Update the daily budget of a campaign',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash)'),
        campaign_id: z.string().describe('The campaign ID (hash) to update'),
        budget: z.number().min(1).describe('The new daily budget in dollars'),
      }),
    },
    async (args) => {
      const response = await apiClient.patch<UpdateResponse>(
        `/v1/amazon/campaigns/${args.campaign_id}/budget`,
        {
          profile_id: args.profile_id,
          budget: args.budget,
        }
      );

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to update campaign budget'}` }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: response.message || `Campaign budget updated to $${args.budget}/day`,
        }],
      };
    }
  );

  // Search campaigns
  server.tool(
    'search_campaigns',
    {
      description: 'Search for campaigns by name',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash)'),
        query: z.string().min(2).describe('Search query (campaign name)'),
      }),
    },
    async (args) => {
      const response = await apiClient.get<CampaignsResponse>('/v1/amazon/campaigns/search', {
        profile_id: args.profile_id as string,
        q: args.query as string,
      });

      // Handle data not ready response (for future ES-based search)
      if (response.data_not_ready) {
        const estimatedTime = response.estimated_minutes
          ? `Estimated time: ~${response.estimated_minutes} minutes.`
          : 'Please try again later.';

        return {
          content: [{
            type: 'text',
            text: `**Data Not Yet Available**\n\n${response.message}\n\n${estimatedTime}`,
          }],
        };
      }

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Search failed'}` }],
        };
      }

      const campaigns = response.data.campaigns;

      if (campaigns.length === 0) {
        return {
          content: [{ type: 'text', text: `No campaigns found matching "${args.query}"` }],
        };
      }

      const formatted = campaigns.map((c: Campaign) =>
        `- **${c.name}** (ID: ${c.id}) - ${c.state}, $${c.daily_budget}/day`
      ).join('\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${campaigns.length} campaign(s) matching "${args.query}":\n\n${formatted}`,
        }],
      };
    }
  );
}
