# Changelog

All notable changes to the PPC Prophet MCP Server will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-01-06

### Added
- Initial release of PPC Prophet MCP Server
- 17 MCP tools for Amazon Advertising data access
- Profile management tools:
  - `list_profiles` - List all connected Amazon Ads profiles
  - `set_current_profile` - Switch active profile context
  - `list_mcp_profiles` - View MCP activation status
  - `activate_mcp_profile` - Enable profile for querying
  - `deactivate_mcp_profile` - Disable profile from MCP access
  - `check_mcp_status` - Check data import progress
- Campaign analytics tools:
  - `list_campaigns` - List campaigns with filtering
  - `get_campaign` - Get detailed campaign info
  - `get_campaign_performance` - Performance metrics with date ranges and sorting
  - `search_campaigns` - Search campaigns by name
  - `update_campaign_status` - Pause, enable, or archive campaigns
  - `update_campaign_budget` - Update daily budget
- Keyword analytics tools:
  - `list_keywords` - List keywords with filtering
  - `update_keyword_bid` - Update keyword bid amounts
  - `update_keyword_status` - Pause, enable, or archive keywords
- Performance reporting:
  - `get_performance` - Aggregate performance across campaigns
  - Fast queries for historical data access
  - 90 days of indexed campaign and keyword performance data
- TypeScript type definitions for all API responses
- Full MCP protocol compliance
- Laravel Sanctum token authentication
- Multi-profile support with context switching
- Read-only access on free tier
- Write access (campaign management, bid updates) on paid tiers

### Technical Details
- Query performance: <100ms average
- Data retention: 90 days historical performance data
- Daily automatic sync for data freshness
- Profile-level access control with Sanctum scopes
- Support for Claude Desktop, ChatGPT, Cursor, Cline, and custom MCP clients

## [Unreleased]

### Planned
- Search term reporting and harvesting
- Advanced filtering (product targeting, placements)
- Budget recommendation engine
- Negative keyword suggestions
- Bulk operations for campaign and keyword management
- Custom date range comparisons (MTD vs last month, etc.)
- Ad group level performance reporting
