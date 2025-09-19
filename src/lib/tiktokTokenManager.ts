/**
 * TikTok Official API Token Manager
 * Manages OAuth 2.0 tokens with automatic refresh (24-hour tokens vs 10-second unofficial tokens)
 * Based on TikTok for Developers OAuth 2.0 documentation
 */

import { Logger } from "pino";

export interface TikTokTokenData {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  scope: string;
  expires_at: Date;
}

export interface TikTokApiConfig {
  client_key: string;
  client_secret: string;
  redirect_uri: string;
}

export class TikTokTokenManager {
  private config: TikTokApiConfig;
  private tokenData: TikTokTokenData | null = null;
  private logger?: Logger;
  private readonly baseUrl = "https://open.tiktokapis.com/v2/oauth";

  constructor(config: TikTokApiConfig, logger?: Logger) {
    this.config = config;
    this.logger = logger;
  }

  /**
   * Exchange authorization code for initial access token
   */
  async getInitialToken(authorizationCode: string): Promise<TikTokTokenData> {
    this.logger?.info('🔑 [TikTokTokenManager] Exchanging authorization code for access token');
    
    const url = `${this.baseUrl}/token/`;
    const data = new URLSearchParams({
      client_key: this.config.client_key,
      client_secret: this.config.client_secret,
      code: authorizationCode,
      grant_type: 'authorization_code',
      redirect_uri: this.config.redirect_uri
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: data
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TikTok token exchange failed: ${response.status} - ${errorText}`);
    }

    const tokenResponse = await response.json();
    this.tokenData = {
      ...tokenResponse,
      expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000)
    };

    this.logger?.info('✅ [TikTokTokenManager] Access token obtained successfully');

    return this.tokenData!;
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshAccessToken(): Promise<TikTokTokenData> {
    if (!this.tokenData?.refresh_token) {
      throw new Error('No refresh token available');
    }

    this.logger?.info('🔄 [TikTokTokenManager] Refreshing access token');

    const url = `${this.baseUrl}/token/`;
    const data = new URLSearchParams({
      client_key: this.config.client_key,
      client_secret: this.config.client_secret,
      grant_type: 'refresh_token',
      refresh_token: this.tokenData.refresh_token
    });

    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Cache-Control': 'no-cache'
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: data
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`TikTok token refresh failed: ${response.status} - ${errorText}`);
    }

    const tokenResponse = await response.json();
    this.tokenData = {
      ...tokenResponse,
      expires_at: new Date(Date.now() + tokenResponse.expires_in * 1000)
    };

    this.logger?.info('✅ [TikTokTokenManager] Access token refreshed successfully');
    return this.tokenData!;
  }

  /**
   * Check if current access token is expired or expires soon (5 minutes buffer)
   */
  isTokenExpired(): boolean {
    if (!this.tokenData?.expires_at) {
      return true;
    }
    // Refresh 5 minutes before expiry
    const fiveMinutesFromNow = new Date(Date.now() + 5 * 60 * 1000);
    return this.tokenData.expires_at <= fiveMinutesFromNow;
  }

  /**
   * Get a valid access token, refreshing if necessary
   */
  async getValidToken(): Promise<string> {
    if (this.isTokenExpired()) {
      if (this.tokenData?.refresh_token) {
        await this.refreshAccessToken();
      } else {
        throw new Error('Token expired and no refresh token available. Re-authorization required.');
      }
    }

    if (!this.tokenData?.access_token) {
      throw new Error('No access token available');
    }

    return this.tokenData.access_token;
  }

  /**
   * Set token data (e.g., from database storage)
   */
  setTokenData(tokenData: TikTokTokenData): void {
    this.tokenData = tokenData;
  }

  /**
   * Get current token data
   */
  getTokenData(): TikTokTokenData | null {
    return this.tokenData;
  }

  /**
   * Generate authorization URL for user consent
   */
  generateAuthUrl(scope: string = 'user.info.basic,video.list'): string {
    const params = new URLSearchParams({
      client_key: this.config.client_key,
      scope: scope,
      response_type: 'code',
      redirect_uri: this.config.redirect_uri,
      state: Math.random().toString(36).substring(2, 15) // Simple CSRF protection
    });

    return `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`;
  }
}