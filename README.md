# PPC Prophet MCP Server

**MCP server for Amazon Advertising.** Let AI agents read and act on your campaigns, keywords, and performance data.

Built for consultants, agencies, and power users who need programmatic access to Amazon Ads. Not a dashboard—infrastructure.

[![npm version](https://img.shields.io/npm/v/@ppcprophet/mcp-server)](https://www.npmjs.com/package/@ppcprophet/mcp-server)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Quick Start

### 1. Get API Token

Sign up at **[ppcgpt.com](https://ppcgpt.com)** and generate an MCP token (free for read-only access).

### 2. Add to Claude Desktop

Edit your Claude Desktop config file:

**macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
**Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "ppc-prophet": {
      "command": "npx",
      "args": ["-y", "@ppcprophet/mcp-server"],
      "env": {
        "PPC_PROPHET_API_TOKEN": "your_token_here",
        "PPC_PROPHET_API_URL": "https://ppcgpt.getppcprophet.com"
      }
    }
  }
}
```

### 3. Restart Claude Desktop

The MCP server will auto-install via `npx` on first run. Start asking questions:

```
"Show me my top 5 campaigns by ROAS last month"
"Which keywords have spend > $100 but zero sales?"
"List all campaigns with ACOS above 50%"
```

---

## What's Included

### 17 MCP Tools (Read-Only)

#### Profile Management
- `list_profiles` - List all connected Amazon Ads profiles
- `set_current_profile` - Switch active profile context
- `list_mcp_profiles` - View MCP activation status
- `activate_mcp_profile` - Enable profile for querying
- `check_mcp_status` - Check data import progress

#### Campaign Analytics
- `list_campaigns` - List campaigns with filtering (status, type, spend)
- `get_campaign` - Get detailed campaign info
- `get_campaign_performance` - Performance metrics with date ranges
- `search_campaigns` - Search campaigns by name

#### Keyword Analytics
- `list_keywords` - List keywords with filtering (match type, status, spend)
- `update_keyword_bid` - Update keyword bid (write access)
- `update_keyword_status` - Pause/enable keywords (write access)

#### Performance Data
- `get_performance` - Aggregate performance across campaigns
- 90 days of historical data
- Query speed: <100ms average

**Write access tools** (update campaigns, bids, budgets) available on paid plans.

---

## Real Workflow Examples

### Daily Anomaly Detection

```
Agent runs every morning at 9 AM:
1. Pull yesterday's performance via get_campaign_performance()
2. Compare to 7-day average
3. Flag campaigns with spend +30% or ACOS +15%
4. Post Slack notification with root cause analysis

Result: Catch budget overspends before they compound.
```

### Client Narrative Reports

```
Weekly automation:
1. list_campaigns() → get all campaign data
2. Send to GPT-4 with prompt: "Write client-friendly summary"
3. Generate PDF with charts
4. Email to client

Result: Replaces 2 hours of analyst work per client.
```

### Search Term Harvesting

```
Daily scan:
1. Pull high-converting search terms (CVR > 5%)
2. Check if already exists as exact match keyword
3. If new + spend potential > $50/day → create keyword
4. Send approval request to human

Result: Automated keyword expansion from top performers.
```

### Wasted Spend Alerts

```
Weekly digest:
1. list_keywords(status: "enabled", min_spend: 100)
2. Filter: spend > $100, zero sales in 14 days
3. Rank by wasted budget
4. Email with pause recommendations

Result: Identify $500-2000/week in wasted spend per account.
```

See [examples/](./examples) folder for full implementation guides.

---

## How It Works

### Architecture

```
Claude Desktop (or any MCP client)
    ↓
@ppcprophet/mcp-server (this package)
    ↓
PPC Prophet API (Amazon Ads data)
    ↓
Amazon Advertising API
```

### MCP Tools → API Calls

When you ask Claude:
> "Show me campaigns with ROAS > 5x"

Claude calls:
```typescript
get_campaign_performance({
  start_date: "2024-01-01",
  end_date: "2024-01-31",
  sort_by: "roas",
  order: "desc"
})
```

The MCP server translates this to an API request, returns structured data, and Claude formats it naturally.

### Data Flow

1. **Activation**: Connect Amazon Ads account via OAuth
2. **Import**: Background job pulls 90 days of campaign/keyword/performance data
3. **Index**: Data indexed for fast querying
4. **Query**: MCP server → API → Results in <100ms
5. **Refresh**: Daily sync keeps data current

---

## Supported MCP Clients

- ✅ **Claude Desktop** (Anthropic)
- ✅ **ChatGPT** (OpenAI, via MCP bridge)
- ✅ **Cursor** (AI code editor)
- ✅ **Cline** (VS Code extension)
- ✅ **Custom agents** (any MCP-compatible client)

---

## API Authentication

Uses Laravel Sanctum tokens:
- Each token is unique (supports multiple devices)
- Scoped permissions (`mcp:read`, `mcp:write`)
- Revocable from dashboard
- Profile-level access control

---

## Pricing

### Free (Read-Only)
- 1 Amazon Ads profile
- All 17 read-only tools
- 100 API calls/day
- 90 days historical data
- Perfect for analytics and reporting agents

### Pro ($99/mo)
- 5 profiles
- Read + write tools (campaign management, bid updates)
- 1,000 API calls/day
- Priority support

### Enterprise (Custom)
- Unlimited profiles
- White-label deployment
- Custom MCP tools
- SLA guarantees

[Get access →](https://ppcgpt.com)

---

## TypeScript Types

Full type definitions included:

```typescript
interface CampaignPerformance {
  profile_id: string;
  campaign_id: string;
  campaign_name: string;
  status: "enabled" | "paused" | "archived";
  targeting_type: "auto" | "manual";
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
```

See [types/index.d.ts](./types/index.d.ts) for full definitions.

---

## Roadmap

- [x] Read-only MCP tools (campaigns, keywords, performance)
- [x] Multi-profile support
- [x] Fast data indexing (90-day historical data)
- [ ] Write access (campaign management, bid updates) - Q1 2026
- [ ] Search term reporting
- [ ] Advanced filtering (product targeting, placements)
- [ ] Budget recommendation engine
- [ ] Negative keyword suggestions

---

## Support

- **Issues**: [GitHub Issues](https://github.com/ppcprophet/mcp-server/issues)
- **Email**: hello@getppcprophet.com
- **Docs**: [getppcprophet.com/docs](https://getppcprophet.com/docs)

---

## FAQ

### Do I need to install anything?

No. The `npx` command auto-downloads and runs the MCP server. Just add the config and restart Claude.

### Is my Amazon Ads data secure?

Yes. Authentication is via Sanctum tokens (no passwords stored). Data is encrypted in transit and at rest. You can revoke access anytime from the dashboard.

### Can I use this with ChatGPT?

Yes, via MCP bridge tools. See [examples/chatgpt-setup.md](./examples/chatgpt-setup.md).

### What if I manage multiple Amazon accounts?

Activate each profile separately. Use `set_current_profile` to switch context, or specify `profile_id` in each tool call.

### Is the code open source?

The npm package and examples are public. The backend API is proprietary (handles Amazon Ads API integration, data indexing, etc.).

---

## License

MIT License - See [LICENSE](./LICENSE)

---

## Links

- **Website**: [getppcprophet.com](https://getppcprophet.com)
- **npm**: [@ppcprophet/mcp-server](https://www.npmjs.com/package/@ppcprophet/mcp-server)
- **Changelog**: [CHANGELOG.md](./CHANGELOG.md)

---

**Built by Amazon Ads specialists.** Not affiliated with Amazon.
