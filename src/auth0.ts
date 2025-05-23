// Auth0 OAuth implementation for MCP Server
import { z } from "zod";

// Environment configuration interface
export interface Auth0Config {
  domain: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

// Auth0 token response schema
const TokenResponseSchema = z.object({
  access_token: z.string(),
  id_token: z.string().optional(),
  token_type: z.string(),
  expires_in: z.number(),
  refresh_token: z.string().optional(),
  scope: z.string().optional(),
});

export type TokenResponse = z.infer<typeof TokenResponseSchema>;

// Auth0 user info schema
const UserInfoSchema = z.object({
  sub: z.string(),
  email: z.string().email(),
  email_verified: z.boolean().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export type UserInfo = z.infer<typeof UserInfoSchema>;

// Generate a secure random string for PKCE
export function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Generate code challenge from verifier
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Generate random state for CSRF protection
export function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

// Build Auth0 authorization URL
export function buildAuthorizationUrl(
  config: Auth0Config,
  state: string,
  codeChallenge: string,
): string {
  const params = new URLSearchParams({
    response_type: "code",
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: "openid email profile",
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  return `https://${config.domain}/authorize?${params.toString()}`;
}

// Exchange authorization code for tokens
export async function exchangeCodeForTokens(
  config: Auth0Config,
  code: string,
  codeVerifier: string,
): Promise<TokenResponse> {
  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "authorization_code",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code: code,
      redirect_uri: config.redirectUri,
      code_verifier: codeVerifier,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token exchange failed: ${error}`);
  }

  const data = await response.json();
  return TokenResponseSchema.parse(data);
}

// Get user information from Auth0
export async function getUserInfo(
  domain: string,
  accessToken: string,
): Promise<UserInfo> {
  const response = await fetch(`https://${domain}/userinfo`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get user info: ${response.statusText}`);
  }

  const data = await response.json();
  return UserInfoSchema.parse(data);
}

// Refresh access token
export async function refreshAccessToken(
  config: Auth0Config,
  refreshToken: string,
): Promise<TokenResponse> {
  const response = await fetch(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      grant_type: "refresh_token",
      client_id: config.clientId,
      client_secret: config.clientSecret,
      refresh_token: refreshToken,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Token refresh failed: ${error}`);
  }

  const data = await response.json();
  return TokenResponseSchema.parse(data);
}

// Cookie helpers
export interface AuthCookies {
  authToken?: string;
  refreshToken?: string;
  codeVerifier?: string;
  state?: string;
}

export function parseCookies(cookieHeader: string | null): AuthCookies {
  const cookies: AuthCookies = {};
  if (!cookieHeader) return cookies;

  cookieHeader.split(";").forEach((cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name === "auth_token") cookies.authToken = value;
    if (name === "refresh_token") cookies.refreshToken = value;
    if (name === "code_verifier") cookies.codeVerifier = value;
    if (name === "state") cookies.state = value;
  });

  return cookies;
}

export function createSecureCookie(
  name: string,
  value: string,
  options: {
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: "Strict" | "Lax" | "None";
    maxAge?: number;
    path?: string;
  } = {},
): string {
  const {
    httpOnly = true,
    secure = true,
    sameSite = "Lax",
    maxAge = 3600,
    path = "/",
  } = options;

  let cookie = `${name}=${value}; Path=${path}; SameSite=${sameSite}`;
  if (httpOnly) cookie += "; HttpOnly";
  if (secure) cookie += "; Secure";
  if (maxAge) cookie += `; Max-Age=${maxAge}`;

  return cookie;
}