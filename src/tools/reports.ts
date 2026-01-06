/**
 * Reporting tools
 */

import { z } from 'zod';
import { ApiClient } from '../api-client.js';
import { PerformanceResponse, Campaign } from '../types.js';

export function registerReportTools(
  server: {
    tool: (
      name: string,
      schema: { description: string; inputSchema: z.ZodObject<z.ZodRawShape> },
      handler: (args: Record<string, unknown>) => Promise<{ content: Array<{ type: string; text: string }> }>
    ) => void;
  },
  apiClient: ApiClient
) {
  // Get performance report
  server.tool(
    'get_performance',
    {
      description: 'Get performance metrics for campaigns in a date range',
      inputSchema: z.object({
        profile_id: z.string().describe('The profile ID (hash)'),
        start_date: z.string().describe('Start date in YYYY-MM-DD format'),
        end_date: z.string().describe('End date in YYYY-MM-DD format'),
      }),
    },
    async (args) => {
      const response = await apiClient.get<PerformanceResponse>('/v1/amazon/reports/performance', {
        profile_id: args.profile_id as string,
        start_date: args.start_date as string,
        end_date: args.end_date as string,
      });

      // Handle data not ready response
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
          content: [{ type: 'text', text: `Error: ${response.error || 'Failed to fetch performance data'}` }],
        };
      }

      const data = response.data;
      const campaigns = data.campaigns;

      if (campaigns.length === 0) {
        return {
          content: [{
            type: 'text',
            text: `No performance data found for ${args.start_date} to ${args.end_date}`,
          }],
        };
      }

      // Calculate totals
      let totalImpressions = 0;
      let totalClicks = 0;
      let totalSpend = 0;
      let totalSales = 0;

      campaigns.forEach((c: Campaign) => {
        if (c.metrics) {
          totalImpressions += c.metrics.impressions;
          totalClicks += c.metrics.clicks;
          totalSpend += c.metrics.spend;
          totalSales += c.metrics.sales;
        }
      });

      const overallAcos = totalSales > 0 ? ((totalSpend / totalSales) * 100).toFixed(1) : 'N/A';
      const overallRoas = totalSpend > 0 ? (totalSales / totalSpend).toFixed(2) : 'N/A';
      const ctr = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(2) : 'N/A';

      const summary = `**Performance Summary (${args.start_date} to ${args.end_date})**

**Overall Metrics:**
- Impressions: ${totalImpressions.toLocaleString()}
- Clicks: ${totalClicks.toLocaleString()}
- CTR: ${ctr}%
- Spend: $${totalSpend.toFixed(2)}
- Sales: $${totalSales.toFixed(2)}
- ACoS: ${overallAcos}%
- ROAS: ${overallRoas}x

**Campaigns (${campaigns.length}):**
${campaigns.map((c: Campaign) =>
  `- ${c.name}: ${c.state}`
).join('\n')}`;

      return {
        content: [{ type: 'text', text: summary }],
      };
    }
  );
}
