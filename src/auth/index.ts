import type { Context } from "hono";
import { getCookie, setCookie, deleteCookie } from "hono/cookie";
import type {
	AuthRequest,
	OAuthHelpers,
	TokenExchangeCallbackOptions,
	TokenExchangeCallbackResult,
} from "@cloudflare/workers-oauth-provider";

import type { UserProps } from "../types";
import type { Env } from "../index";

/**
 * Generate cryptographically secure random state
 */
function generateSecureState(): string {
	const stateBytes = new Uint8Array(16); // 128 bits
	crypto.getRandomValues(stateBytes);
	return btoa(String.fromCharCode(...stateBytes))
		.replace(/\+/g, "-")
		.replace(/\//g, "_")
		.replace(/=/g, "");
}

/**
 * Constant-time string comparison
 */
function constantTimeCompare(a: string, b: string): boolean {
	if (a.length !== b.length) return false;
	let result = 0;
	for (let i = 0; i < a.length; i++) {
		result |= a.charCodeAt(i) ^ b.charCodeAt(i);
	}
	return result === 0;
}

/**
 * OAuth Authorization Endpoint
 *
 * This route initiates the Authorization Code Flow when a user wants to log in.
 * It creates a random state parameter to prevent CSRF attacks and stores the
 * original request information in KV for later retrieval.
 * Then it redirects to Phoenix for authentication.
 */
export async function authorize(c: Context<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>) {
	const mcpAuthRequest = await c.env.OAUTH_PROVIDER.parseAuthRequest(c.req.raw);
	if (!mcpAuthRequest.clientId) {
		return c.text("Invalid request", 400);
	}

	const client = await c.env.OAUTH_PROVIDER.lookupClient(mcpAuthRequest.clientId);
	if (!client) {
		return c.text("Invalid client", 400);
	}

	// Validate redirect URI
	if (!isValidRedirectUri(client, mcpAuthRequest.redirectUri)) {
		return c.text("Invalid redirect URI", 400);
	}

	// Generate state with proper entropy (128+ bits)
	const state = generateSecureState();

	// Store auth request in KV (not cookie) with 5 minute TTL
	if (c.env.OAUTH_KV) {
		const currentUrl = new URL(c.req.url);
		const workerRedirectUri = `${currentUrl.origin}/oauth/callback`;
		await c.env.OAUTH_KV.put(
			`state:${state}`,
			JSON.stringify({
				request: mcpAuthRequest,
				created: Date.now(),
				client_id: mcpAuthRequest.clientId,
				// Bind to the WORKER callback URI, not the client's
				redirect_uri: workerRedirectUri,
			}),
			{ expirationTtl: 300 }, // 5 minutes
		);
	} else {
		return c.text("OAuth KV namespace not configured", 500);
	}

    // Set minimal state cookie (HttpOnly). Use Secure only over HTTPS in dev.
    const reqUrl = new URL(c.req.url);
    const isSecure = reqUrl.protocol === "https:";
    setCookie(c, "mcp_state", state, {
        httpOnly: true,
        secure: isSecure,
        sameSite: "Lax",
        maxAge: 300, // 5 minutes
        path: "/oauth",
    });

	// Redirect to Phoenix login
	const phoenixLoginUrl = new URL(`${c.env.PHOENIX_API_URL}/auth/mcp/login`);
	phoenixLoginUrl.searchParams.set("state", state);
	phoenixLoginUrl.searchParams.set("client_id", mcpAuthRequest.clientId);
	const currentUrl = new URL(c.req.url);
	phoenixLoginUrl.searchParams.set("redirect_uri", `${currentUrl.origin}/oauth/callback`);
	if (mcpAuthRequest.scope && mcpAuthRequest.scope.length > 0) {
		phoenixLoginUrl.searchParams.set("scope", mcpAuthRequest.scope.join(" "));
	}

	return c.redirect(phoenixLoginUrl.href);
}

/**
 * Validate redirect URI against client configuration
 */
function isValidRedirectUri(client: any, redirectUri: string): boolean {
	// In production, this should check against registered redirect URIs
	// For now, basic validation
	return redirectUri.startsWith("http://localhost:") || redirectUri.startsWith("https://");
}

/**
 * OAuth Callback Endpoint
 *
 * This route handles the callback from Phoenix after user authentication.
 * It verifies the authorization code and completes the authorization process.
 */
export async function callback(c: Context<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>) {
	const code = c.req.query("code");
	const state = c.req.query("state");

	// Validate state from cookie
	const cookieState = getCookie(c, "mcp_state");
	if (!state || !cookieState || !constantTimeCompare(state, cookieState)) {
		return c.text("Invalid state", 400);
	}

	// Retrieve stored auth request from KV
	if (!c.env.OAUTH_KV) {
		return c.text("OAuth KV namespace not configured", 500);
	}
	const stateData = await c.env.OAUTH_KV.get(`state:${state}`);
	if (!stateData) {
		return c.text("State expired or invalid", 400);
	}

	const { request: mcpAuthRequest, client_id, redirect_uri } = JSON.parse(stateData);

	// Delete state from KV (single use)
	if (c.env.OAUTH_KV) {
		await c.env.OAUTH_KV.delete(`state:${state}`);
	}

	// Prepare verification request with HMAC
	const timestamp = Math.floor(Date.now() / 1000);
	const body = {
		code,
		client_id,
		redirect_uri,
		state,
	};

	// Calculate HMAC signature using canonical JSON to avoid key order differences
	const message = `${timestamp}.${canonicalJSONStringify(body)}`;
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(c.env.PHOENIX_CLIENT_SECRET),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));
	const hmac = btoa(String.fromCharCode(...new Uint8Array(signature)));

	// Verify code with Phoenix
	const verifyResponse = await fetch(`${c.env.PHOENIX_API_URL}/api/auth/verify`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${hmac}`,
			"X-Request-Timestamp": timestamp.toString(),
			"X-Client-Id": client_id,
		},
		body: JSON.stringify(body),
	});

	if (!verifyResponse.ok) {
		// Log verification failure
		console.error("Verification failed:", await verifyResponse.text());
		return c.text("Authentication failed", 401);
	}

	const userInfo = (await verifyResponse.json()) as any;

	// Generate tokens based on user info
	const idToken = await generateIdToken(userInfo, c.env);
	const accessToken = await generateAccessToken(userInfo, c.env);

	// Complete OAuth flow
	const { redirectTo } = await c.env.OAUTH_PROVIDER.completeAuthorization({
		request: mcpAuthRequest,
		userId: userInfo.sub,
		scope: mcpAuthRequest.scope || [],
		metadata: {
			label: userInfo.email,
			amr: userInfo.amr, // Preserve auth method
		},
		props: {
			claims: userInfo,
			tokenSet: {
				idToken: idToken,
				accessToken: accessToken,
				accessTokenTTL: 3600, // 1 hour
			},
		} as UserProps,
	});

	// Clear state cookie
	deleteCookie(c, "mcp_state", { path: "/oauth" });

	return Response.redirect(redirectTo);
}

// Deterministic JSON stringifier with sorted keys (recursively)
function canonicalJSONStringify(value: any): string {
  if (value === null || typeof value !== "object") {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((v) => canonicalJSONStringify(v)).join(",")}]`;
  }
  const keys = Object.keys(value).sort();
  const parts = keys.map((k) => `${JSON.stringify(k)}:${canonicalJSONStringify(value[k])}`);
  return "{" + parts.join(",") + "}";
}

/**
 * Generate ID token for the user
 */
async function generateIdToken(userInfo: any, env: Env): Promise<string> {
	// For now, return a simple base64 encoded JSON
	// In production, this should be a properly signed JWT
	return btoa(
		JSON.stringify({
			sub: userInfo.sub,
			email: userInfo.email,
			email_verified: userInfo.email_verified,
			iat: userInfo.iat,
			exp: userInfo.exp,
		}),
	);
}

/**
 * Generate access token for the user
 */
async function generateAccessToken(userInfo: any, env: Env): Promise<string> {
	// For now, return a simple token
	// In production, this should integrate with your token service
	return `mcp_${userInfo.sub}_${Date.now()}`;
}

/**
 * Token Exchange Callback
 *
 * This function handles the token exchange callback for the CloudflareOAuth Provider
 */
export async function tokenExchangeCallback(
	options: TokenExchangeCallbackOptions,
): Promise<TokenExchangeCallbackResult | void> {
	// During the Authorization Code Exchange, we want to make sure that the Access Token issued
	// by the MCP Server has the same TTL as configured
	if (options.grantType === "authorization_code") {
		const ttlInSeconds = options.props.tokenSet.accessTokenTTL;
		const ttlInMs = (ttlInSeconds || 3600) * 1000; // Convert to milliseconds

		console.log("[OAuth][tokenExchange] Authorization code grant:", {
			grantType: options.grantType,
			originalTTL: ttlInSeconds,
			convertedTTLMs: ttlInMs,
			userSub: options.props.claims?.sub,
		});

		return {
			newProps: {
				...options.props,
			},
			accessTokenTTL: ttlInMs, // Use milliseconds
		};
	}

	// Refresh token support can be added later if needed
	if (options.grantType === "refresh_token") {
		console.log("[OAuth][tokenExchange] Refresh token grant not implemented for Phoenix");
		// For now, just extend the current token
		return {
			newProps: options.props,
			accessTokenTTL: 3600 * 1000, // 1 hour in milliseconds
		};
	}
}
