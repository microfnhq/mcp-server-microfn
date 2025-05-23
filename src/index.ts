#!/usr/bin/env node
import { Hono } from 'hono';
import OAuthProvider, { type OAuthHelpers } from '@cloudflare/workers-oauth-provider';
import { authorize, callback, confirmConsent, tokenExchangeCallback } from './auth/index.js';
import { AuthenticatedMCP } from './AuthenticatedMCP.js';
import type { UserProps } from './types.js';

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
}

// Initialize the Hono app with the routes for the OAuth Provider
const app = new Hono<{ Bindings: Env & { OAUTH_PROVIDER: OAuthHelpers } }>();

// OAuth routes
app.get('/authorize', authorize);
app.post('/authorize/consent', confirmConsent);
app.get('/callback', callback);

// Logout endpoint to clear session
app.get('/logout', (c) => {
	// Clear all OAuth-related cookies
	const headers = new Headers();
	
	// List of cookie names that might be set by the OAuth provider
	const cookiesToClear = [
		'oauth_session',
		'oauth_state', 
		'oauth_code_verifier',
		'auth_token',
		'refresh_token'
	];
	
	cookiesToClear.forEach(cookieName => {
		headers.append('Set-Cookie', `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax`);
	});
	
	return c.html(`
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
	`, 200, headers);
});

// Health check endpoint
app.get('/', (c) => {
	return c.json({
		name: 'MicroFn MCP Server',
		version: '1.0.0',
		endpoints: {
			mcp: '/sse',
			oauth: {
				authorize: '/authorize',
				callback: '/callback',
				logout: '/logout',
			},
		},
	});
});

// Export the OAuth provider with MCP mounted at /sse
export default new OAuthProvider({
	apiRoute: '/sse',
	apiHandler: AuthenticatedMCP.mount('/sse'),
	defaultHandler: {
		fetch: async (request: Request, env: any, ctx: ExecutionContext) => {
			return app.fetch(request, env, ctx);
		}
	},
	authorizeEndpoint: '/authorize',
	tokenEndpoint: '/token',
	clientRegistrationEndpoint: '/register',
	tokenExchangeCallback,
});