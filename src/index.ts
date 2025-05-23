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