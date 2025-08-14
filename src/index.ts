#!/usr/bin/env node
import { Hono } from "hono";
import OAuthProvider, { type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { authorize, callback, confirmConsent, tokenExchangeCallback } from "./auth/index.js";
import { AuthenticatedMCP } from "./AuthenticatedMCP.js";
import { UserDataCache } from "./UserDataCache.js";
import { createStreamableHTTPHandler } from "./StreamableHTTPHandler.js";
import type { UserProps } from "./types.js";
import { wrapDurableObjectMount } from "./auth/errorHandler.js";

// Export the Durable Object classes for Cloudflare Workers
export { AuthenticatedMCP, UserDataCache };

// Environment interface
export interface Env {
	MICROFN_API_TOKEN?: string;
	AUTH0_DOMAIN?: string;
	AUTH0_CLIENT_ID?: string;
	AUTH0_CLIENT_SECRET?: string;
	AUTH0_REDIRECT_URI?: string;
	AUTH0_REDIRECT_URI_DEV?: string;
	AUTH0_AUDIENCE?: string;
	AUTH0_SCOPE?: string;
	COOKIE_SECRET?: string;
	API_BASE_URL?: string;
	NODE_ENV?: string;
	OAUTH_KV?: KVNamespace;
	MCP_OBJECT?: DurableObjectNamespace;
	USER_DATA_CACHE?: DurableObjectNamespace;
	MCP_REQUEST_TIMEOUT_MS?: number;
	FUNCTION_EXECUTION_TIMEOUT_MS?: number;
	MCP_SERVER_URL?: string;
}

// Initialize the Hono app with the routes for the OAuth Provider
const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

// CORS preflight handler for all routes
app.options("*", (c) => {
	return new Response(null, {
		status: 204,
		headers: {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, POST, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type, Authorization, MCP-Protocol-Version",
			"Access-Control-Max-Age": "86400",
		},
	});
});

// OAuth routes
app.get("/oauth/authorize", authorize);
app.post("/oauth/authorize/consent", confirmConsent);
app.get("/oauth/callback", callback);

// Logout endpoint to clear session
app.get("/logout", (c) => {
	// Clear all OAuth-related cookies
	const cookiesToClear = [
		"oauth_session",
		"oauth_state",
		"oauth_code_verifier",
		"auth_token",
		"refresh_token",
	];

	cookiesToClear.forEach((cookieName) => {
		c.header(
			"Set-Cookie",
			`${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`,
		);
	});

	return c.html(
		`
		<!DOCTYPE html>
		<html>
		<head>
			<title>Logged Out</title>
			<style>
				body { font-family: Arial, sans-serif; text-align: center; margin-top: 100px; }
				.container { max-width: 400px; margin: 0 auto; }
				.button { background: #4361ee; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; }
			</style>
		</head>
		<body>
			<div class="container">
				<h1>✓ Logged Out</h1>
				<p>You have been logged out successfully.</p>
				<p>Your MCP client will need to re-authenticate on the next connection.</p>
				<a href="/" class="button">Back to Home</a>
			</div>
		</body>
		</html>
	`,
		200,
	);
});

// Health check endpoint
app.get("/", (c) => {
	// Add CORS headers
	c.header("Access-Control-Allow-Origin", "*");
	c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
	c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, MCP-Protocol-Version");

	return c.json({
		name: "MicroFn MCP Server",
		version: "1.0.0",
		endpoints: {
			mcp: {
				sse: "/sse", // Legacy SSE endpoint
				http: "/mcp", // New streamable-http endpoint
			},
			oauth: {
				authorize: "/authorize",
				callback: "/callback",
				logout: "/logout",
			},
		},
	});
});

// Note: OAuthProvider automatically handles /.well-known/oauth-authorization-server
// We don't need to implement it ourselves

// OAuth protected resource metadata endpoint for MCP clients
app.get("/.well-known/oauth-protected-resource/:path", (c) => {
	const path = c.req.param("path");

	// Use MCP_SERVER_URL from environment, fallback to request origin
	const baseUrl = c.env.MCP_SERVER_URL || new URL(c.req.url).origin;

	console.log("[OAuth] Protected resource discovery for path:", path);
	console.log("[OAuth] Using base URL:", baseUrl);

	// Add CORS headers for MCP Inspector
	c.header("Access-Control-Allow-Origin", "*");
	c.header("Access-Control-Allow-Methods", "GET, OPTIONS");
	c.header("Access-Control-Allow-Headers", "Content-Type, Authorization, MCP-Protocol-Version");

	const resourceUrl = `${baseUrl}/${path}`;
	console.log("[OAuth] Returning resource URL:", resourceUrl);

	return c.json({
		authorization_server: baseUrl,
		resource: resourceUrl,
		oauth_flows_supported: ["authorization_code"],
		oauth_authorization_server: `${baseUrl}/.well-known/oauth-authorization-server`,
		client_registration_endpoint: `${baseUrl}/oauth/register`,
	});
});

// Create wrapped handlers for both endpoints
const durableObjectHandler = AuthenticatedMCP.mount("/sse");
const wrappedSseHandler = wrapDurableObjectMount(durableObjectHandler);

const streamableHttpHandler = createStreamableHTTPHandler();
const wrappedMcpHandler = wrapDurableObjectMount(streamableHttpHandler);

// Export a function that creates the OAuth provider with environment-specific URLs
export default {
	fetch: (request: Request, env: Env, ctx: ExecutionContext) => {
		// Get the base URL from environment or use production default
		const baseUrl = env.MCP_SERVER_URL || "https://mcp.microfn.dev";

		const url = new URL(request.url);
		console.log("[OAuthProvider] Request path:", url.pathname);
		console.log("[OAuthProvider] Using base URL:", baseUrl);

		// Create the OAuth provider with paths (not full URLs)
		// OAuthProvider will handle /oauth/token and /oauth/register automatically
		const provider = new OAuthProvider({
			apiHandlers: {
				"/sse": wrappedSseHandler as any,
				"/mcp": wrappedMcpHandler as any,
			},
			defaultHandler: app as any,
			authorizeEndpoint: "/oauth/authorize",
			tokenEndpoint: "/oauth/token",
			clientRegistrationEndpoint: "/oauth/register",
			tokenExchangeCallback,
		});

		// Pass the request to the provider
		return provider.fetch(request, env, ctx);
	},
};
