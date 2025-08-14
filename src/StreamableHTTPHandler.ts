import { createMcpServer } from "./mcpServerFactory.js";
import type { UserProps } from "./types.js";
import type { Env } from "./index.js";
import type { UserDataCacheStub } from "./UserDataCache.js";
import type { JSONRPCMessage, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Define a more flexible JSONRPCResponse type that handles both success and error cases
type JSONRPCResponse = {
	jsonrpc: "2.0";
	id: string | number | null;
} & (
	| { result: any; error?: never }
	| { error: { code: number; message: string; data?: any }; result?: never }
);

// Session management for stateful connections
type Session = { server: McpServer; last: number };
const sessions = new Map<string, Session>();
const SESSION_TTL_MS = 15 * 60_000; // 15 minutes

function gcSessions() {
	const now = Date.now();
	for (const [sid, s] of sessions) {
		if (now - s.last > SESSION_TTL_MS) {
			sessions.delete(sid);
		}
	}
}

/**
 * Simple JSON-RPC transport for Cloudflare Workers
 * Implements a basic request/response pattern without streaming
 */
class SimpleJSONRPCTransport {
	private messageHandler?: (message: JSONRPCMessage) => void;
	private responsePromise?: Promise<JSONRPCResponse>;
	private responseResolver?: (response: JSONRPCResponse) => void;
	private env?: Env;
	private connectionState: "disconnected" | "connecting" | "connected" | "error" = "disconnected";
	private startTime?: number;

	// SSE support
	private sseWriter?: WritableStreamDefaultWriter;
	private sseClosed = false;

	onmessage?: (message: JSONRPCMessage) => void;
	onerror?: (error: Error) => void;
	onclose?: () => void;

	constructor(env?: Env) {
		this.env = env;
	}

	private getTimeout(): number {
		// Default to 25 seconds to stay under Cloudflare's 30s limit
		// Can be configured via environment variable
		return this.env?.MCP_REQUEST_TIMEOUT_MS || 25000;
	}

	getConnectionState(): string {
		return this.connectionState;
	}

	getConnectionDuration(): number {
		return this.startTime ? Date.now() - this.startTime : 0;
	}

	async start(): Promise<void> {
		this.connectionState = "connecting";
		this.startTime = Date.now();
		// Simulate connection establishment
		this.connectionState = "connected";
		console.log("[Transport] Connection established");
	}

	async close(): Promise<void> {
		if (this.connectionState === "connected") {
			this.connectionState = "disconnected";
			console.log(`[Transport] Connection closed after ${this.getConnectionDuration()}ms`);
		}
		this.onclose?.();
	}

	async send(message: JSONRPCMessage): Promise<void> {
		if (this.connectionState !== "connected") {
			const error = new Error(
				`Cannot send message - connection state: ${this.connectionState}`,
			);
			this.onerror?.(error);
			return;
		}

		// If this is a server -> client notification (no id), emit over SSE if available
		if (!("id" in message) || message.id === undefined || message.id === null) {
			if (this.sseWriter && !this.sseClosed) {
				const payload = `data: ${JSON.stringify(message)}\n\n`;
				try {
					await this.sseWriter.write(new TextEncoder().encode(payload));
				} catch (e) {
					console.log("[Transport] SSE write failed:", e);
					this.sseClosed = true;
				}
			}
			return;
		}

		// Otherwise it is a response to a request
		if (this.responseResolver) {
			this.responseResolver(message as JSONRPCResponse);
		}
	}

	/**
	 * Handle an incoming request and return the response
	 */
	async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse | null> {
		if (this.connectionState !== "connected") {
			return {
				jsonrpc: "2.0",
				error: {
					code: -32000,
					message: `Connection not established - current state: ${this.connectionState}. Retry the request to reconnect.`,
					data: {
						reconnectable: true,
						connectionState: this.connectionState,
						retryAfterMs: 1000,
					},
				},
				id: request.id ?? null,
			};
		}

		return new Promise((resolve) => {
			this.responseResolver = resolve;
			this.onmessage?.(request);

			// Set a configurable timeout to prevent hanging
			const timeoutMs = this.getTimeout();
			const timeoutHandler = setTimeout(() => {
				this.connectionState = "error";
				resolve({
					jsonrpc: "2.0",
					error: {
						code: -32000,
						message:
							"Connection closed - request timeout. To reconnect, retry this exact same request to the same MCP endpoint. Wait 2-3 seconds before retrying.",
						data: {
							reconnectable: true,
							retryAfterMs: 2000,
							instruction:
								"Retry the same JSON-RPC request to reconnect automatically",
							connectionDuration: this.getConnectionDuration(),
							timeoutMs: timeoutMs,
						},
					},
					id: request.id ?? null,
				});
			}, timeoutMs);

			// Clear timeout if response comes before timeout
			const originalResolver = this.responseResolver;
			this.responseResolver = (response: JSONRPCResponse) => {
				clearTimeout(timeoutHandler);
				originalResolver?.(response);
			};
		});
	}
}

/**
 * Handler for the streamable-http transport
 * Implements a simple JSON-RPC request/response pattern for Cloudflare Workers
 */
export class StreamableHTTPHandler {
	constructor(
		private env: Env,
		private userProps: UserProps,
	) {}

	async handle(request: Request, executionContext: ExecutionContext): Promise<Response> {
		// Handle CORS preflight requests
		if (request.method === "OPTIONS") {
			const origin = request.headers.get("Origin") || "*";
			const acrh =
				request.headers.get("Access-Control-Request-Headers") ||
				"Content-Type, Authorization, Accept, Mcp-Session-Id";
			return new Response(null, {
				status: 204,
				headers: {
					"Access-Control-Allow-Origin": origin,
					"Access-Control-Allow-Methods": "POST, OPTIONS",
					"Access-Control-Allow-Headers": acrh,
					"Access-Control-Max-Age": "86400",
					Vary: "Origin, Access-Control-Request-Headers",
				},
			});
		}

		try {
			console.log("[StreamableHTTP] Handle called with userProps:", {
				hasTokenSet: !!this.userProps.tokenSet,
				hasIdToken: !!this.userProps.tokenSet?.idToken,
				hasAccessToken: !!this.userProps.tokenSet?.accessToken,
				userEmail: this.userProps.claims?.email,
				userSub: this.userProps.claims?.sub,
				method: request.method,
			});

			const apiToken = this.userProps.tokenSet?.idToken;

			if (!apiToken) {
				console.error(
					"[StreamableHTTP] No Auth0 ID token available for user:",
					this.userProps.claims?.email,
				);
				console.error("[StreamableHTTP] UserProps:", {
					tokenSet: this.userProps.tokenSet,
					claims: this.userProps.claims,
				});
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: 401,
							message: "No Auth0 ID token available. Please re-authenticate.",
						},
						id: null,
					}),
					{
						status: 401,
						headers: {
							"Content-Type": "application/json",
						},
					},
				);
			}

			console.log(
				"[StreamableHTTP] Handling request for user:",
				this.userProps.claims?.email,
			);
			console.log("[StreamableHTTP] ID token prefix:", apiToken.substring(0, 10) + "...");

			// Streamable HTTP spec: GET must be SSE or 405. We return 405 here.
			if (request.method === "GET") {
				return new Response("SSE not supported on this endpoint", {
					status: 405,
					headers: {
						Allow: "POST, OPTIONS",
						"Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
					},
				});
			}

			// Only handle POST requests with JSON-RPC payloads
			if (request.method !== "POST") {
				return new Response(
					"Method not allowed. Use GET to establish session or POST with JSON-RPC payload.",
					{
						status: 405,
						headers: {
							Allow: "GET, POST",
						},
					},
				);
			}

			let body: JSONRPCRequest;
			try {
				body = (await request.json()) as JSONRPCRequest;
			} catch (error) {
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32700,
							message: "Parse error",
						},
						id: null,
					}),
					{
						status: 400,
						headers: {
							"Content-Type": "application/json",
						},
					},
				);
			}

			// Get session ID from header
			const reqSid = request.headers.get("Mcp-Session-Id") || undefined;

			// Validate JSON-RPC request
			if (!body.jsonrpc || body.jsonrpc !== "2.0" || !body.method) {
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32600,
							message: "Invalid Request",
						},
						id: body.id ?? null,
					}),
					{
						status: 400,
						headers: {
							"Content-Type": "application/json",
						},
					},
				);
			}

			console.log("[StreamableHTTP] Processing JSON-RPC request:", {
				method: body.method,
				hasParams: !!body.params,
				params: body.params,
				id: body.id,
				hasSessionId: !!reqSid,
			});
			console.log("[StreamableHTTP] Full request body:", JSON.stringify(body));

			// Create or resume the session **before** delivering the message
			let sid = reqSid;
			let session = sid ? sessions.get(sid) : undefined;

			if (!session || body.method === "initialize") {
				// Fresh session on first initialize or if unknown sid
				const userId = this.userProps.claims?.sub || this.userProps.claims?.email;
				const userCacheDO =
					userId && this.env.USER_DATA_CACHE
						? (this.env.USER_DATA_CACHE.get(
								this.env.USER_DATA_CACHE.idFromName(userId),
							) as unknown as UserDataCacheStub)
						: undefined;

				const server = await createMcpServer(
					apiToken,
					this.userProps,
					this.env,
					undefined,
					undefined,
					userCacheDO,
				);

				sid = crypto.randomUUID();
				session = { server, last: Date.now() };
				sessions.set(sid, session);
				console.log("[StreamableHTTP] Created new session:", sid);
			}
			session.last = Date.now();
			gcSessions();

			// Base headers for all responses
			const baseHeaders = {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers":
					request.headers.get("Access-Control-Request-Headers") ||
					"Content-Type, Authorization, Accept, Mcp-Session-Id",
				"Mcp-Session-Id": sid!, // Important: include session ID
				Vary: "Origin, Access-Control-Request-Headers",
			};

			// If it's a JSON-RPC notification, deliver it and return 202 immediately
			if (!("id" in body) || body.id === undefined || body.id === null) {
				const transport = new SimpleJSONRPCTransport(this.env);
				await transport.start();
				await session!.server.connect(transport);
				// Deliver to server without waiting for any response
				transport.onmessage?.(body as JSONRPCRequest);
				console.log("[StreamableHTTP] Handled notification:", body.method);
				return new Response(null, {
					status: 202,
					headers: { ...baseHeaders },
				});
			}

			// Handle regular request with response
			const transport = new SimpleJSONRPCTransport(this.env);
			await transport.start();
			await session!.server.connect(transport);
			const response = await transport.handleRequest(body);

			// Return the response
			if (response) {
				return new Response(JSON.stringify(response), {
					headers: { ...baseHeaders },
				});
			} else {
				// Shouldn't happen for requests with ID, but handle gracefully
				return new Response("", {
					status: 204,
					headers: { ...baseHeaders },
				});
			}
		} catch (error) {
			console.error("[StreamableHTTP] Error handling request:", error);

			// Check if this is a connection-related error
			const isConnectionError =
				error instanceof Error &&
				(error.message.includes("timeout") ||
					error.message.includes("connection") ||
					error.message.includes("closed") ||
					error.message.includes("aborted"));

			if (isConnectionError) {
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32000,
							message: `Connection error: ${error instanceof Error ? error.message : "Unknown connection error"}. To reconnect, retry this exact same request to the same MCP endpoint.`,
							data: {
								reconnectable: true,
								retryAfterMs: 2000,
								instruction:
									"Retry the same JSON-RPC request to reconnect automatically",
								errorType: "connection",
							},
						},
						id: null,
					}),
					{
						status: 200, // Use 200 for JSON-RPC errors
						headers: {
							"Content-Type": "application/json",
							"Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
							"Access-Control-Allow-Methods": "POST, OPTIONS",
							"Access-Control-Allow-Headers":
								request.headers.get("Access-Control-Request-Headers") ||
								"Content-Type, Authorization, Accept, Mcp-Session-Id",
							Vary: "Origin, Access-Control-Request-Headers",
						},
					},
				);
			}

			// For other errors, return a generic internal error
			return new Response(
				JSON.stringify({
					jsonrpc: "2.0",
					error: {
						code: -32603,
						message: error instanceof Error ? error.message : "Internal error",
					},
					id: null,
				}),
				{
					status: 500,
					headers: {
						"Content-Type": "application/json",
						"Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
						"Access-Control-Allow-Methods": "POST, OPTIONS",
						"Access-Control-Allow-Headers":
							request.headers.get("Access-Control-Request-Headers") ||
							"Content-Type, Authorization, Accept, Mcp-Session-Id",
						Vary: "Origin, Access-Control-Request-Headers",
					},
				},
			);
		}
	}
}

/**
 * Factory function to create a handler that works with the OAuth provider
 * The OAuth provider will pass the user props in the execution context
 */
export function createStreamableHTTPHandler() {
	return {
		fetch: async (
			request: Request,
			env: Env,
			ctx: ExecutionContext & { props?: UserProps },
		) => {
			// The OAuth provider will ensure authentication before reaching this point
			// If ctx.props is missing, it means the OAuth provider configuration is incorrect
			const userProps = ctx.props;
			console.log("[StreamableHTTP] createStreamableHTTPHandler called:", {
				hasProps: !!userProps,
				hasMicrofnToken: !!userProps?.microfnToken,
				userEmail: userProps?.claims?.email,
			});

			if (!userProps) {
				console.error("[StreamableHTTP] No user props provided by OAuth provider");
				// Return a proper error that indicates OAuth configuration issue
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32603,
							message: "Internal error: OAuth provider did not provide user context",
						},
						id: null,
					}),
					{
						status: 500,
						headers: {
							"Content-Type": "application/json",
						},
					},
				);
			}

			const handler = new StreamableHTTPHandler(env, userProps);
			return handler.handle(request, ctx);
		},
	};
}
