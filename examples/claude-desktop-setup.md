# Claude Desktop Setup Guide

Complete guide to setting up the PPC Prophet MCP Server with Claude Desktop.

## Prerequisites

- Claude Desktop app installed ([download here](https://claude.ai/download))
- PPC Prophet account with MCP token ([sign up here](https://ppcgpt.com))
- Amazon Advertising account connected to PPC Prophet

## Step 1: Get Your MCP Token

1. Log in to [ppcgpt.com](https://ppcgpt.com)
2. Navigate to **Account → MCP Setup**
3. Click **"Generate New Token"**
4. Enter a descriptive name (e.g., "Claude Desktop - MacBook Pro")
5. Click **"Generate Token"**
6. Copy the token immediately (it won't be shown again)

## Step 2: Configure Claude Desktop

### macOS

1. Open Finder
2. Press `Cmd + Shift + G` (Go to Folder)
3. Enter: `~/Library/Application Support/Claude/`
4. Open or create `claude_desktop_config.json`

### Windows

1. Press `Win + R`
2. Enter: `%APPDATA%\Claude\`
3. Open or create `claude_desktop_config.json`

### Add Configuration

Paste this configuration into the file:

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

**Replace `your_token_here` with your actual token.**

### Multiple MCP Servers?

If you already have other MCP servers configured, just add `ppc-prophet` to the existing `mcpServers` object:

```json
{
  "mcpServers": {
    "existing-server": {
      "command": "...",
      "args": ["..."]
    },
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

## Step 3: Restart Claude Desktop

1. **Quit Claude Desktop completely** (don't just close the window)
   - macOS: `Cmd + Q`
   - Windows: Right-click taskbar icon → Exit
2. Relaunch Claude Desktop
3. The MCP server will auto-install via `npx` on first run (takes ~10 seconds)

## Step 4: Activate Your Profiles

Before you can query data, you need to activate your Amazon Advertising profiles for MCP access:

```
1. List my profiles
2. Activate profile #1 for MCP access
3. Check the import status
```

Wait for the status to show **"READY"** before querying data (usually 2-5 minutes).

## Step 5: Test It Out

Try these example queries:

```
"Show me my top 5 campaigns by ROAS last month"

"List all campaigns with ACOS above 50%"

"Which keywords have spend > $100 but zero sales?"

"What's my total ad spend for December 2025?"
```

## Troubleshooting

### Server Not Showing Up

**Check the MCP icon** in Claude Desktop's bottom-left corner. You should see "ppc-prophet" listed.

If not:
1. Verify `claude_desktop_config.json` syntax is valid (use [jsonlint.com](https://jsonlint.com))
2. Make sure you **fully quit** Claude Desktop (not just closed the window)
3. Check that the file is saved in the correct location

### "Authentication Failed" Errors

1. Verify your token is correct (no extra spaces)
2. Check token hasn't been revoked in PPC Prophet dashboard
3. Regenerate a new token if needed

### "Profile Not Found" Errors

1. Run `list_mcp_profiles` to see activation status
2. Activate the profile: `activate_mcp_profile` with the profile number
3. Wait for `check_mcp_status` to show "READY" before querying

### Slow First Request

The first API call after restart may take 10-15 seconds while `npx` downloads the package. Subsequent requests are fast (<100ms).

## Managing Tokens

### Creating Multiple Tokens

You can create multiple tokens for different devices:
- "Claude Desktop - Work Laptop"
- "Claude Desktop - Home PC"
- "Custom Script - Daily Reports"

Each token can be revoked independently.

### Revoking Tokens

If a device is lost or you want to revoke access:
1. Go to **Account → MCP Setup**
2. Click **"Revoke"** next to the token
3. That device will immediately lose access

## Advanced Configuration

### Custom API Endpoint

If you're using a self-hosted PPC Prophet instance:

```json
{
  "mcpServers": {
    "ppc-prophet": {
      "command": "npx",
      "args": ["-y", "@ppcprophet/mcp-server"],
      "env": {
        "PPC_PROPHET_API_TOKEN": "your_token_here",
        "PPC_PROPHET_API_URL": "https://your-domain.com"
      }
    }
  }
}
```

### Running Locally

For development, you can run the server locally:

```json
{
  "mcpServers": {
    "ppc-prophet": {
      "command": "node",
      "args": ["/path/to/mcp-server/dist/index.js"],
      "env": {
        "PPC_PROPHET_API_TOKEN": "your_token_here",
        "PPC_PROPHET_API_URL": "http://localhost:8000"
      }
    }
  }
}
```

## Next Steps

- Check out [daily-anomaly-workflow.md](./daily-anomaly-workflow.md) for automation ideas
- Read the [full documentation](https://getppcprophet.com/docs) for all available tools
- Join the community on [GitHub Discussions](https://github.com/ppcprophet/amazon-ads-mcp/discussions)

## Support

- **Issues**: [GitHub Issues](https://github.com/ppcprophet/amazon-ads-mcp/issues)
- **Email**: hello@getppcprophet.com
- **Docs**: [getppcprophet.com/docs](https://getppcprophet.com/docs)
