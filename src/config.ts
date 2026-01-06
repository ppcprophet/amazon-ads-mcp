/**
 * MCP Server Configuration
 * Loads settings from environment variables
 */

export interface Config {
  apiUrl: string;
  apiKey: string;
  defaultProfileId?: string;
}

// Default to production API unless overridden
const DEFAULT_API_URL = 'https://ppcgpt.getppcprophet.com';

export function loadConfig(): Config {
  const apiUrl = process.env.PPC_PROPHET_API_URL || DEFAULT_API_URL;
  const apiKey = process.env.PPC_PROPHET_API_KEY;
  const defaultProfileId = process.env.PPC_PROPHET_DEFAULT_PROFILE_ID;

  if (!apiKey) {
    logError('PPC_PROPHET_API_KEY environment variable is required');
    logError('Get your API token from https://ppcgpt.com (Settings > API Access)');
    process.exit(1);
  }

  return {
    apiUrl: apiUrl.replace(/\/$/, ''), // Remove trailing slash
    apiKey,
    defaultProfileId: defaultProfileId || undefined,
  };
}

/**
 * Log errors to stderr (safe for MCP stdio transport)
 */
export function logError(message: string, error?: unknown): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] ERROR: ${message}`, error ?? '');
}

/**
 * Log info messages to stderr (safe for MCP stdio transport)
 */
export function logInfo(message: string): void {
  const timestamp = new Date().toISOString();
  console.error(`[${timestamp}] INFO: ${message}`);
}
