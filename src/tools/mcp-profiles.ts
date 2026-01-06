/**
 * MCP Profile management tools
 *
 * These tools allow users to see all their profiles and their MCP activation status,
 * activate profiles for MCP access, and check import status.
 */

import { z } from 'zod';
import { ApiClient } from '../api-client.js';
import { McpProfilesResponse, McpProfile, McpProfileStatusResponse, McpActivateResponse } from '../types.js';

export function registerMcpProfileTools(
  server: {
    tool: (
      name: string,
      schema: { description: string; inputSchema: z.ZodObject<z.ZodRawShape> },
      handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
    ) => void;
  },
  apiClient: ApiClient
) {
  // List all profiles with MCP status
  server.tool(
    'list_mcp_profiles',
    {
      description: 'List all Amazon advertising profiles with their MCP activation status. Shows which profiles are ready for querying, which need activation, and which are currently importing data.',
      inputSchema: z.object({}),
    },
    async () => {
      const response = await apiClient.get<McpProfilesResponse>('/v1/mcp/profiles');

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch profiles'}` }],
        };
      }

      const profiles = response.data.profiles;

      if (profiles.length === 0) {
        return {
          content: [{ type: 'text', text: 'No Amazon advertising profiles found for this account.' }],
        };
      }

      // Group profiles by status
      const ready = profiles.filter((p: McpProfile) => p.is_ready);
      const importing = profiles.filter((p: McpProfile) => p.mcp_activated && !p.is_ready);
      const notActivated = profiles.filter((p: McpProfile) => !p.mcp_activated);

      let text = `Found ${profiles.length} profile(s):\n\n`;

      if (ready.length > 0) {
        text += `**Ready for Queries (${ready.length}):**\n`;
        ready.forEach((p: McpProfile) => {
          text += `  #${p.number}. ${p.name} (${p.region})\n`;
        });
        text += '\n';
      }

      if (importing.length > 0) {
        text += `**Importing Data (${importing.length}):**\n`;
        importing.forEach((p: McpProfile) => {
          const eta = p.estimated_minutes ? ` - ~${p.estimated_minutes} min remaining` : '';
          text += `  #${p.number}. ${p.name} (${p.region}) - ${p.mcp_data_status}${eta}\n`;
        });
        text += '\n';
      }

      if (notActivated.length > 0) {
        text += `**Not Activated (${notActivated.length}):**\n`;
        notActivated.forEach((p: McpProfile) => {
          text += `  #${p.number}. ${p.name} (${p.region})\n`;
        });
        text += '\n';
      }

      text += `To activate a profile, use: activate_mcp_profile with name and region\nExample: "Activate Nkay US" or "Activate FillCo Int'l"`;

      return {
        content: [{ type: 'text', text }],
      };
    }
  );

  // Activate a profile for MCP
  server.tool(
    'activate_mcp_profile',
    {
      description: 'Activate an Amazon advertising profile for MCP access. This triggers data import which may take 10-30 minutes depending on account size.',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash) to activate for MCP access'),
      }),
    },
    async (args) => {
      const profileId = args.profile_id as string;

      const response = await apiClient.post<McpActivateResponse>('/v1/mcp/profiles/activate', {
        profile_id: profileId,
      });

      if (!response.success) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to activate profile'}` }],
        };
      }

      const data = response.data;
      let text = `**Profile Activated for MCP Access**\n\n`;
      text += `Profile ID: ${data?.profile_id || profileId}\n`;
      text += `Status: ${data?.status || 'pending'}\n`;

      if (data?.estimated_minutes) {
        text += `Estimated time: ~${data.estimated_minutes} minutes\n`;
      }

      text += `\nData import has started. Use \`check_mcp_status\` to monitor progress.`;

      return {
        content: [{ type: 'text', text }],
      };
    }
  );

  // Check MCP status for a profile
  server.tool(
    'check_mcp_status',
    {
      description: 'Check the MCP data import status for a specific profile. Use this to see if a profile is ready for querying.',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash) to check status for'),
      }),
    },
    async (args) => {
      const profileId = args.profile_id as string;

      const response = await apiClient.get<McpProfileStatusResponse>(
        `/v1/mcp/profiles/${profileId}/status`
      );

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to get status'}` }],
        };
      }

      const status = response.data;

      let text = `**MCP Profile Status**\n\n`;
      text += `Available: ${status.available ? 'Yes' : 'No'}\n`;
      text += `Status: ${status.reason}\n`;
      text += `Message: ${status.message}\n`;

      if (status.estimated_minutes) {
        text += `Estimated time remaining: ~${status.estimated_minutes} minutes\n`;
      }

      if (status.activated_at) {
        text += `Activated at: ${status.activated_at}\n`;
      }

      if (status.available) {
        text += `\nThis profile is ready for queries. You can now use other MCP tools to manage campaigns, keywords, and view performance data.`;
      }

      return {
        content: [{ type: 'text', text }],
      };
    }
  );

  // Deactivate a profile from MCP
  server.tool(
    'deactivate_mcp_profile',
    {
      description: 'Deactivate an Amazon advertising profile from MCP access. This removes the profile from MCP queries.',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash) to deactivate from MCP access'),
      }),
    },
    async (args) => {
      const profileId = args.profile_id as string;

      const response = await apiClient.post<{ message: string }>('/v1/mcp/profiles/deactivate', {
        profile_id: profileId,
      });

      if (!response.success) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to deactivate profile'}` }],
        };
      }

      return {
        content: [{
          type: 'text',
          text: `Profile deactivated from MCP access. You can reactivate it at any time using \`activate_mcp_profile\`.`
        }],
      };
    }
  );
}
