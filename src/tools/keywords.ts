/**
 * Keyword management tools
 */

import { z } from 'zod';
import { ApiClient } from '../api-client.js';
import { KeywordsResponse, Keyword, UpdateResponse } from '../types.js';

export function registerKeywordTools(
  server: {
    tool: (
      name: string,
      schema: { description: string; inputSchema: z.ZodObject<z.ZodRawShape> },
      handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
    ) => void;
  },
  apiClient: ApiClient
) {
  // List keywords
  server.tool(
    'list_keywords',
    {
      description: 'List keywords for a profile or campaign',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash)'),
        campaign_id: z.string().optional().describe('Optional: filter by specific campaign ID'),
        status: z.enum(['enabled', 'paused', 'archived']).optional().describe('Filter by keyword status'),
        match_type: z.enum(['exact', 'phrase', 'broad', 'negativeExact', 'negativePhrase']).optional().describe('Filter by match type'),
        limit: z.number().min(1).max(500).optional().describe('Maximum number of keywords to return'),
      }),
    },
    async (args) => {
      const params: Record<string, string> = {
        profile_id: args.profile_id as string,
      };

      if (args.campaign_id) params.campaign_id = args.campaign_id as string;
      if (args.status) params.status = args.status as string;
      if (args.match_type) params.match_type = args.match_type as string;
      if (args.limit) params.limit = String(args.limit);

      const response = await apiClient.get<KeywordsResponse>('/v1/amazon/keywords', params);

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch keywords'}` }],
        };
      }

      const keywords = response.data.keywords;

      if (keywords.length === 0) {
        return {
          content: [{ type: 'text', text: 'No keywords found matching your criteria.' }],
        };
      }

      const formatted = keywords.map((k: Keyword) =>
        `- **${k.keyword}** (ID: ${k.id})
  Match: ${k.match_type} | Status: ${k.state} | Bid: $${k.bid}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${keywords.length} keyword(s):\n\n${formatted}`,
        }],
      };
    }
  );

  // Update keyword bid
  server.tool(
    'update_keyword_bid',
    {
      description: 'Update the bid amount for a keyword',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash)'),
        keyword_id: z.string().describe('The keyword ID (hash) to update'),
        bid: z.number().min(0.02).max(1000).describe('The new bid amount in dollars (min $0.02, max $1000)'),
      }),
    },
    async (args) => {
      const response = await apiClient.patch<UpdateResponse>(
        `/v1/amazon/keywords/${args.keyword_id}/bid`,
        {
          profile_id: args.profile_id,
          bid: args.bid,
        }
      );

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to update keyword bid'}` }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: response.message || `Keyword bid updated to $${args.bid}`,
        }],
      };
    }
  );

  // Update keyword status
  server.tool(
    'update_keyword_status',
    {
      description: 'Update the status of a keyword (pause, enable, or archive)',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash)'),
        keyword_id: z.string().describe('The keyword ID (hash) to update'),
        status: z.enum(['enabled', 'paused', 'archived']).describe('The new status for the keyword'),
      }),
    },
    async (args) => {
      const response = await apiClient.patch<UpdateResponse>(
        `/v1/amazon/keywords/${args.keyword_id}/status`,
        {
          profile_id: args.profile_id,
          status: args.status,
        }
      );

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to update keyword status'}` }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: response.message || `Keyword status updated to ${args.status}`,
        }],
      };
    }
  );
}
