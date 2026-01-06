# Daily Anomaly Detection Workflow

Automate daily checks for spend anomalies, ACOS spikes, and performance drops using PPC Prophet MCP Server.

## Overview

This workflow runs every morning at 9 AM and:
1. Pulls yesterday's campaign performance
2. Compares to 7-day baseline
3. Flags campaigns with significant deviations
4. Posts alerts to Slack with root cause analysis

**Result**: Catch budget overspends and performance issues before they compound.

## What Gets Flagged

### Spend Anomalies
- Spend increased >30% vs 7-day average
- Daily budget pacing >85% before noon
- Single campaign consuming >50% of account budget

### ACOS Spikes
- ACOS increased >15 percentage points
- ACOS >50% with spend >$100
- Zero sales with spend >$50

### Performance Drops
- Impressions down >40%
- CTR down >30%
- Conversion rate down >50%

## Implementation Options

Choose your automation platform:

### Option 1: Claude Desktop + Cron (Simple)

Schedule a daily prompt in Claude Desktop using macOS cron or Windows Task Scheduler.

**macOS Setup:**

1. Create a script `~/bin/ppc-anomaly-check.sh`:

```bash
#!/bin/bash

# Open Claude Desktop with the anomaly check prompt
open -a "Claude" --args --prompt "Run daily anomaly check for yesterday. Flag any campaigns with spend +30%, ACOS +15%, or impressions -40%. Post summary to #ppc-alerts Slack channel."
```

2. Make executable: `chmod +x ~/bin/ppc-anomaly-check.sh`

3. Add to crontab (`crontab -e`):

```cron
0 9 * * * /Users/yourname/bin/ppc-anomaly-check.sh
```

**Windows Setup:**

1. Create `C:\Scripts\ppc-anomaly-check.bat`:

```batch
@echo off
start "" "C:\Program Files\Claude\Claude.exe" --prompt "Run daily anomaly check..."
```

2. Open Task Scheduler
3. Create Basic Task → Daily at 9:00 AM
4. Action: Start a Program → Browse to the .bat file

### Option 2: Custom Script (Advanced)

Use Node.js to run checks programmatically and post to Slack.

**Prerequisites:**
- Node.js installed
- Slack webhook URL ([create one here](https://api.slack.com/messaging/webhooks))

**1. Install dependencies:**

```bash
npm init -y
npm install @anthropic-ai/sdk node-fetch
```

**2. Create `anomaly-detector.js`:**

```javascript
const Anthropic = require('@anthropic-ai/sdk');
const fetch = require('node-fetch');

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

async function runAnomalyCheck() {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 8);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split('T')[0];

  const prompt = `
You are a PPC analyst running daily anomaly detection.

1. Get yesterday's campaign performance (${yesterdayStr})
2. Get the 7-day baseline (${sevenDaysAgoStr} to ${yesterdayStr})
3. Flag campaigns where:
   - Spend increased >30% vs 7-day average
   - ACOS increased >15 percentage points
   - Impressions decreased >40%
   - ACOS >50% with spend >$100
   - Zero sales with spend >$50

4. For each flagged campaign, analyze:
   - What metric triggered the alert?
   - How much did it deviate?
   - Possible root causes (bid changes, budget changes, competition, etc.)

5. Format output as a Slack message with:
   - Summary count of flagged campaigns
   - Table of top 5 issues
   - Recommended actions

Use PPC Prophet MCP tools to get the data.
`;

  const response = await client.messages.create({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 4096,
    messages: [{
      role: 'user',
      content: prompt
    }],
    tools: [], // MCP tools automatically available if configured
  });

  const analysis = response.content[0].text;

  // Post to Slack
  await fetch(process.env.SLACK_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: '🚨 Daily PPC Anomaly Report',
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: analysis
          }
        }
      ]
    })
  });

  console.log('Anomaly check complete. Report sent to Slack.');
}

runAnomalyCheck().catch(console.error);
```

**3. Set environment variables:**

```bash
export ANTHROPIC_API_KEY="your_anthropic_api_key"
export SLACK_WEBHOOK_URL="your_slack_webhook_url"
```

**4. Schedule with cron:**

```cron
0 9 * * * cd /path/to/script && node anomaly-detector.js >> anomaly.log 2>&1
```

### Option 3: n8n Workflow (No-Code)

Use [n8n](https://n8n.io) for a visual automation workflow.

**Workflow Structure:**

1. **Schedule Trigger** - Daily at 9:00 AM
2. **HTTP Request** - Call Anthropic API with MCP tools
3. **Code Node** - Parse response and format for Slack
4. **Slack Node** - Post message to #ppc-alerts

**Example HTTP Request Node (Step 2):**

```json
{
  "method": "POST",
  "url": "https://api.anthropic.com/v1/messages",
  "headers": {
    "anthropic-version": "2023-06-01",
    "x-api-key": "{{ $env.ANTHROPIC_API_KEY }}"
  },
  "body": {
    "model": "claude-3-5-sonnet-20241022",
    "max_tokens": 4096,
    "messages": [{
      "role": "user",
      "content": "Run daily anomaly check using PPC Prophet MCP tools..."
    }]
  }
}
```

## Sample Output

Here's what a typical alert looks like:

```
🚨 Daily PPC Anomaly Report - January 6, 2026

5 campaigns flagged for review:

┌─────────────────────────────┬─────────┬────────┬─────────────────┐
│ Campaign                    │ Spend   │ ACOS   │ Alert Reason    │
├─────────────────────────────┼─────────┼────────┼─────────────────┤
│ Brand - Exact Match         │ +$427   │ +22%   │ ACOS spike      │
│ Generic - Broad             │ +$312   │ +8%    │ Spend increase  │
│ Competitor - Phrase         │ -45%    │ +5%    │ Traffic drop    │
│ Long Tail - Auto            │ +$156   │ 73%    │ High ACOS       │
│ Product Launch - Manual     │ +$98    │ N/A    │ Zero sales      │
└─────────────────────────────┴─────────┴────────┴─────────────────┘

Recommended Actions:
1. Brand - Exact Match: Check for bid increases or new competitors
2. Generic - Broad: Review search terms for wasted spend
3. Competitor - Phrase: Investigate bid suppression or budget caps
4. Long Tail - Auto: Pause if pattern continues >3 days
5. Product Launch - Manual: Review keyword relevance and bids
```

## Customization Ideas

### Industry-Specific Thresholds

Adjust anomaly thresholds based on your vertical:

**E-commerce (tight margins):**
- ACOS threshold: +10%
- Spend threshold: +20%

**Software/SaaS (high LTV):**
- ACOS threshold: +25%
- Spend threshold: +50%

### Multi-Account Support

Loop through multiple profiles:

```javascript
const profiles = ['profile-1', 'profile-2', 'profile-3'];

for (const profileId of profiles) {
  // Set current profile
  await setCurrentProfile(profileId);

  // Run anomaly check
  const anomalies = await runAnomalyCheck(profileId);

  // Post to profile-specific Slack channel
  await postToSlack(`#${profileId}-alerts`, anomalies);
}
```

### Advanced Root Cause Analysis

Extend the prompt to investigate:
- **Search term changes** - New high-spend terms?
- **Bid history** - Recent bid increases?
- **Competitor activity** - Impression share down?
- **Inventory status** - Out of stock causing traffic drop?

### Trend Detection

Track anomalies over time to identify patterns:

```javascript
const anomalyHistory = await db.getAnomalies({ days: 30 });

// Flag campaigns with repeated issues
const chronic = anomalyHistory.filter(a => a.occurrences >= 3);

if (chronic.length > 0) {
  await postToSlack('#urgent-alerts', `
    ⚠️  ${chronic.length} campaigns with chronic issues (3+ anomalies in 30 days)
  `);
}
```

## Testing

Before going live, test with a dry run:

```bash
# Run script manually (skip Slack posting)
node anomaly-detector.js --dry-run

# Check output locally
node anomaly-detector.js --output-file=./anomaly-report.txt
```

## Cost Estimate

**Anthropic API:**
- ~2,000 tokens per check (input)
- ~1,000 tokens per response (output)
- Daily cost: ~$0.03

**Monthly cost: ~$0.90**

With 10 profiles: ~$9/month

## Next Steps

1. Set up basic daily check using Option 1 (Claude Desktop + cron)
2. Monitor for 7 days to calibrate thresholds
3. Upgrade to Option 2 (custom script) for programmatic control
4. Add root cause analysis and trend detection
5. Expand to other workflows (keyword harvesting, budget pacing, etc.)

## Support

Questions or issues?
- [GitHub Issues](https://github.com/ppcprophet/amazon-ads-mcp/issues)
- Email: hello@getppcprophet.com
