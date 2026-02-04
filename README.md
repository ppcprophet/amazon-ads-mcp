# Amazon Advertising MCP Server

Connect AI assistants to your Amazon Advertising data. Query campaign performance, find wasted spend, diagnose metric changes, and monitor automation rules—all through natural language.

[![Official MCP Registry](https://img.shields.io/badge/MCP%20Registry-Listed-green)](https://registry.modelcontextprotocol.io/)
[![Transport](https://img.shields.io/badge/Transport-Streamable%20HTTP-blue)]()

## What is this?

PPC Prophet MCP is a **hosted Model Context Protocol server** that gives AI assistants (Claude, ChatGPT, Cursor, etc.) direct access to your Amazon Advertising data. No local installation required—just connect and query.

This is **infrastructure for AI agents**, not a dashboard. It enables:
- Natural language queries against your Amazon Ads data
- Automated reporting and alerting workflows
- AI-powered PPC optimization agents
- Integration with any MCP-compatible client

## Features

### 27+ Tools for Amazon Advertising

**Performance Analytics**
- `get_campaign_performance` - Campaign metrics with flexible sorting (sales, ROAS, ACOS, spend, clicks)
- `get_search_term_performance` - Search term analysis sorted by any KPI
- `get_asin_performance` - Product-level performance metrics
- `get_match_type_performance` - Compare exact, phrase, broad, and auto targeting
- `get_dayofweek_performance` - Identify best/worst performing days
- `get_platform_performance` - SP vs SB vs SD breakdown
- `compare_periods` - Week-over-week, month-over-month analysis

**Wasted Spend Analysis**
- `get_wasted_spend` - Find campaigns, keywords, or search terms spending without converting
- Customizable thresholds and result limits
- Campaign, keyword, and search term level analysis

**Root Cause Diagnosis**
- `diagnose_change` - Answer "Why did my ACOS/Sales/Spend change?"
- Drill down from account → campaign → keyword level
- Factor decomposition (CPC, CVR, AOV impact)
- Bid/budget change correlation

**Campaign Management**
- `list_campaigns`, `get_campaign`, `search_campaigns`
- `update_campaign_status`, `update_campaign_budget`
- `list_keywords`, `update_keyword_bid`, `update_keyword_status`

**Rules & Automation** (PPC Prophet subscribers)
- `list_rules` - View automation rules
- `get_rule_details` - Rule configuration and filters
- `get_rule_outcomes` - Execution history
- `get_recent_rule_activity` - Monitor automation across profiles

**Profile Management**
- `list_profiles`, `get_profile`, `set_current_profile`
- `list_mcp_profiles`, `activate_mcp_profile`, `check_mcp_status`

### MCP Apps (Interactive Widgets)

Rich visualizations rendered directly in Claude:
- **Wasted Spend Analyzer** - Visual charts with sortable tables
- **Campaign Performance Dashboard** - Metrics overview with comparisons
- **Diagnose Change** - Waterfall charts showing contribution breakdown

## Quick Start

### 1. Get Your API Token

1. Sign up at [ppcgpt.getppcprophet.com/register](https://ppcgpt.getppcprophet.com/register)
2. Connect your Amazon Advertising account
3. Generate an API token at [ppcgpt.getppcprophet.com/mcp](https://ppcgpt.getppcprophet.com/mcp)

### 2. Configure Your MCP Client

**Claude Desktop / Claude Code (Recommended)**

Run this command in your terminal:

```bash
claude mcp add ppc-prophet \
  --transport http \
  --header "Authorization: Bearer YOUR_TOKEN_HERE" \
  https://ppcgpt.getppcprophet.com/mcp
```

**Manual Configuration**

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "ppc-prophet": {
      "url": "https://ppcgpt.getppcprophet.com/mcp",
      "transport": "streamable-http",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN_HERE"
      }
    }
  }
}
```

### 3. Start Querying

```
"Show me wasted spend on keywords"
"Which campaigns have the best ROAS?"
"Why did my ACOS increase this week?"
"Compare last week to the week before"
```

## Example Queries

| Query | What It Does |
|-------|-------------|
| "Show me top 10 campaigns by sales" | Campaign performance ranked by revenue |
| "Which keywords are losing money?" | Keywords with spend but no conversions |
| "Why did my ACOS spike?" | Root cause analysis with driver attribution |
| "Compare this month to last month" | Period-over-period metrics comparison |
| "What search terms should I add as negatives?" | Non-converting search terms |
| "Show me day of week breakdown" | Performance by Monday-Sunday |
| "Which match type performs best?" | Exact vs phrase vs broad comparison |

## Technical Details

- **Transport**: Streamable HTTP (also supports SSE)
- **Authentication**: Bearer token via Authorization header
- **Data Range**: Last 90 days of performance data
- **Response Time**: Sub-100ms for most queries

## Documentation

- **Full Query Reference**: [ppcgpt.getppcprophet.com/docs/queries](https://ppcgpt.getppcprophet.com/docs/queries)
- **Landing Page**: [ppcgpt.getppcprophet.com](https://ppcgpt.getppcprophet.com/)
- **MCP Setup Guide**: [ppcgpt.getppcprophet.com/mcp](https://ppcgpt.getppcprophet.com/mcp)

## Registry Listings

- [Official MCP Registry](https://registry.modelcontextprotocol.io/) - `io.github.philmccarty/amazon-advertising-ppc-prophet`
- [Glama / awesome-mcp-servers](https://glama.ai/mcp/servers)

## Pricing

| Plan | Profiles | Features | API Calls |
|------|----------|----------|-----------|
| Free | 1 | Read-only tools | 100/day |
| Pro ($99/mo) | 5 | Full access + write tools | Unlimited |

## Support

- **Documentation**: [ppcgpt.getppcprophet.com/docs/queries](https://ppcgpt.getppcprophet.com/docs/queries)
- **Email**: support@getppcprophet.com
- **Main Platform**: [app.getppcprophet.com](https://app.getppcprophet.com/)

## License

Proprietary - Requires PPC Prophet account for access.
