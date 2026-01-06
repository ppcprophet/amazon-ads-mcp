/**
 * Profile management tools
 */

import { z } from 'zod';
import { ApiClient, ApiResponse } from '../api-client.js';
import { ProfilesResponse, Profile } from '../types.js';

export function registerProfileTools(
  server: {
    tool: (
      name: string,
      schema: { description: string; inputSchema: z.ZodObject<z.ZodRawShape> },
      handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
    ) => void;
  },
  apiClient: ApiClient
) {
  // List profiles
  server.tool(
    'list_profiles',
    {
      description: 'List all Amazon advertising profiles for the authenticated user. Returns profile IDs that can be used in other commands.',
      inputSchema: z.object({}),
    },
    async () => {
      const response = await apiClient.get<ProfilesResponse>('/v1/amazon/profiles');

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

      const formatted = profiles.map((p: Profile) =>
        `- **${p.name}** (ID: ${p.profile_id})\n  Marketplace: ${p.marketplace} | Type: ${p.type} | Status: ${p.status}`
      ).join('\n\n');

      return {
        content: [{
          type: 'text',
          text: `Found ${profiles.length} Amazon profile(s):\n\n${formatted}`,
        }],
      };
    }
  );

  // Get single profile details
  server.tool(
    'get_profile',
    {
      description: 'Get detailed information about a specific Amazon advertising profile',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash) to retrieve'),
      }),
    },
    async (args) => {
      const profileId = args.profile_id as string;
      const response = await apiClient.get<Profile>(`/v1/amazon/profiles/${profileId}`);

      if (!response.success || !response.data) {
        return {
          content: [{ type: 'text', text: `Error: ${response.error || 'Profile not found'}` }],
        };
      }

      const profile = response.data;
      const text = `**Profile: ${profile.name}**
- Profile ID: ${profile.profile_id}
- Marketplace: ${profile.marketplace}
- Type: ${profile.type}
- Status: ${profile.status}
- Created: ${profile.created_at || 'Unknown'}`;

      return {
        content: [{ type: 'text', text }],
      };
    }
  );
}
