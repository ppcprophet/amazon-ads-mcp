/**
 * API Client for PPC Prophet Laravel API
 * Handles all HTTP communication with the backend
 */

import { Config, logError } from './config.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  // MCP data availability fields
  data_not_ready?: boolean;
  status?: string;
  estimated_minutes?: number | null;
}

export class ApiClient {
  private config: Config;

  constructor(config: Config) {
    this.config = config;
  }

  /**
   * Make an authenticated GET request
   */
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<ApiResponse<T>> {
    const url = new URL(`${this.config.apiUrl}/api${endpoint}`);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          url.searchParams.append(key, value);
        }
      });
    }

    return this.request<T>(url.toString(), 'GET');
  }

  /**
   * Make an authenticated PATCH request
   */
  async patch<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = `${this.config.apiUrl}/api${endpoint}`;
    return this.request<T>(url, 'PATCH', body);
  }

  /**
   * Make an authenticated POST request
   */
  async post<T>(endpoint: string, body: Record<string, unknown>): Promise<ApiResponse<T>> {
    const url = `${this.config.apiUrl}/api${endpoint}`;
    return this.request<T>(url, 'POST', body);
  }

  /**
   * Core request method
   */
  private async request<T>(
    url: string,
    method: string,
    body?: Record<string, unknown>
  ): Promise<ApiResponse<T>> {
    try {
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      };

      const options: RequestInit = {
        method,
        headers,
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      const data = await response.json() as ApiResponse<T>;

      if (!response.ok) {
        return {
          success: false,
          error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        };
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      logError(`API request failed: ${method} ${url}`, error);
      return {
        success: false,
        error: `Request failed: ${errorMessage}`,
      };
    }
  }
}
