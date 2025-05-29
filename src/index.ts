#!/usr/bin/env node
import { Hono } from "hono";
import OAuthProvider, { type OAuthHelpers } from "@cloudflare/workers-oauth-provider";
import { authorize, callback, confirmConsent, tokenExchangeCallback } from "./auth/index.js";
import { AuthenticatedMCP } from "./AuthenticatedMCP.js";
import { createStreamableHTTPHandler } from "./StreamableHTTPHandler.js";
import type { UserProps } from "./types.js";

// Export the Durable Object class for Cloudflare Workers
export { AuthenticatedMCP };

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
	MCP_REQUEST_TIMEOUT_MS?: number;
	FUNCTION_EXECUTION_TIMEOUT_MS?: number;
}

// Initialize the Hono app with the routes for the OAuth Provider
const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

// OAuth routes
app.get("/authorize", authorize);
app.post("/authorize/consent", confirmConsent);
app.get("/callback", callback);

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

// OAuth metadata endpoint for streamable-http clients
app.get("/.well-known/oauth-authorization-server", (c) => {
	const baseUrl = new URL(c.req.url).origin;
	console.log("base URL", baseUrl);
	return c.json({
		issuer: baseUrl,
		authorization_endpoint: `${baseUrl}/authorize`,
		token_endpoint: `${baseUrl}/token`,
		response_types_supported: ["code"],
		grant_types_supported: ["authorization_code", "refresh_token"],
		code_challenge_methods_supported: ["S256"],
		token_endpoint_auth_methods_supported: [
			"client_secret_post",
			"client_secret_basic",
			"none",
		],
		scopes_supported: ["openid", "email", "profile", "offline_access"],
		claims_supported: ["sub", "email", "name"],
	});
});

// Export the OAuth provider with SSE mounted at /sse
export default new OAuthProvider({
	apiRoute: "/sse",
	apiHandler: AuthenticatedMCP.mount("/sse") as any,
	defaultHandler: app as any,
	authorizeEndpoint: "/authorize",
	tokenEndpoint: "/token",
	clientRegistrationEndpoint: "/register",
	tokenExchangeCallback,
});
