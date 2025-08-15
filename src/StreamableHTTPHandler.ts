import { createMcpServer } from "./mcpServerFactory.js";
import type { UserProps } from "./types.js";
import type { Env } from "./index.js";
import type { UserDataCacheStub } from "./UserDataCache.js";
import type { JSONRPCMessage, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// Isolate marker for debugging - shows when we're on a new Worker isolate
// Must be initialized on first request, not at module level
let ISOLATE_ID: string | undefined;

// Define a more flexible JSONRPCResponse type that handles both success and error cases
type JSONRPCResponse = {
	jsonrpc: "2.0";
	id: string | number | null;
} & (
	| { result: any; error?: never }
	| { error: { code: number; message: string; data?: any }; result?: never }
);

// Session management for stateful connections
type Session = {
	server: McpServer;
	transport: SimpleJSONRPCTransport;
	last: number;
	initialized?: boolean;
	initInFlight?: Promise<void>;
};
const sessions = new Map<string, Session>();
// Barrier to serialize per-SID session creation
const creatingSessions = new Map<string, Promise<Session>>();
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
 * Supports multiple concurrent requests
 */
class SimpleJSONRPCTransport {
	private messageHandler?: (message: JSONRPCMessage) => void;
	// Map to handle multiple concurrent requests - string keys only for ID normalization
	private resolvers = new Map<string, (response: JSONRPCResponse) => void>();
	private timeouts = new Map<string, NodeJS.Timeout>();
	private aborters = new Map<string, AbortController>(); // Track abort controllers
	private timedOut = new Set<string>(); // Track timed out requests
	private env?: Env;
	private labelSid?: string;
	private connectionState: "disconnected" | "connecting" | "connected" = "disconnected";
	private startTime?: number;

	// SSE support
	private sseWriter?: WritableStreamDefaultWriter;
	private sseClosed = false;

	onmessage?: (message: JSONRPCMessage) => void;
	onerror?: (error: Error) => void;
	onclose?: () => void;

	constructor(env?: Env, labelSid?: string) {
		this.env = env;
		this.labelSid = labelSid;
	}

	registerAborter(key: string, ac: AbortController) {
		this.aborters.set(key, ac);
	}

	private getTimeout(): number {
		// Default to 25 seconds to stay under Cloudflare's 30s limit
		// Can be configured via environment variable
		const v = (this.env as any)?.MCP_REQUEST_TIMEOUT_MS;
		const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
		const ms = Number.isFinite(n) && n > 0 ? n : 25000;
		return ms;
	}

	getConnectionState(): string {
		return this.connectionState;
	}

	getConnectionDuration(): number {
		return this.startTime ? Date.now() - this.startTime : 0;
	}

	async start(): Promise<void> {
		if (this.connectionState === "connected") return;
		if (this.connectionState === "connecting") return;
		this.connectionState = "connecting";
		this.startTime = Date.now();
		// Simulate connection establishment
		this.connectionState = "connected";
		console.log("[Transport] Connection established", {
			sid: this.labelSid,
			isolate: ISOLATE_ID,
		});
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

		// Normalize ID to string for lookup
		const key = String(message.id);
		console.log("[RPC] <- server", {
			id: message.id,
			idType: typeof message.id,
			key,
			sid: this.labelSid,
		});

		// Check if this response is for a timed-out request
		if (this.timedOut.has(key)) {
			this.timedOut.delete(key);
			console.warn("[Transport] Late response after timeout", {
				id: message.id,
				sid: this.labelSid,
				isolate: ISOLATE_ID,
			});
			return;
		}

		// Look up the resolver by normalized ID
		const resolver = this.resolvers.get(key);
		if (resolver) {
			// Clear timeout and resolver
			const timeout = this.timeouts.get(key);
			if (timeout) {
				clearTimeout(timeout);
				this.timeouts.delete(key);
			}
			this.aborters.delete(key); // Clean up aborter - request finished
			this.resolvers.delete(key);
			resolver(message as JSONRPCResponse);
		} else {
			console.warn("[Transport] Response for unknown id", {
				id: message.id,
				idType: typeof message.id,
				key,
				have: [...this.resolvers.keys()],
				sid: this.labelSid,
				isolate: ISOLATE_ID,
			});
		}
	}

	/**
	 * Handle an incoming request and return the response
	 * Supports multiple concurrent requests
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

		// Generate an ID if not present (for notifications that we're treating as requests)
		const requestId = request.id ?? `gen:${crypto.randomUUID()}`;
		const key = String(requestId); // Normalize to string for storage

		// Log outgoing request
		console.log("[RPC] -> server", {
			id: requestId,
			idType: typeof requestId,
			method: request.method,
			sid: this.labelSid,
		});

		return new Promise((resolve) => {
			// Store resolver using normalized string key
			this.resolvers.set(key, (response) => {
				resolve(response);
			});

			// Send the request with the original ID type
			this.onmessage?.({ ...request, id: requestId });

			// Set a configurable timeout to prevent hanging
			const timeoutMs = this.getTimeout();
			console.log("[Transport] arming timeout", {
				sid: this.labelSid,
				timeoutMs,
				id: requestId,
				key,
			});

			const timeoutHandler = setTimeout(() => {
				// Clean up this specific request
				this.resolvers.delete(key);
				this.timeouts.delete(key);
				this.timedOut.add(key); // Mark as timed out

				// Abort any in-flight work for this request
				const aborter = this.aborters.get(key);
				if (aborter) {
					aborter.abort("transport-timeout");
					this.aborters.delete(key);
				}

				// Don't set connection to error - just this request timed out
				resolve({
					jsonrpc: "2.0",
					error: {
						code: -32000,
						message: `Connection closed - request timeout after ${timeoutMs}ms. To reconnect, retry this exact same request to the same MCP endpoint. Wait 2-3 seconds before retrying.`,
						data: {
							reconnectable: true,
							retryAfterMs: Math.min(timeoutMs / 2, 3000), // Dynamic retry based on timeout
							instruction:
								"Retry the same JSON-RPC request to reconnect automatically",
							connectionDuration: this.getConnectionDuration(),
							timeoutMs: timeoutMs,
						},
					},
					id: request.id ?? null,
				});
			}, timeoutMs);

			// Store the timeout handler using normalized key
			this.timeouts.set(key, timeoutHandler);
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
		// Initialize isolate ID on first request
		if (!ISOLATE_ID) {
			ISOLATE_ID = crypto.randomUUID();
			console.log(`[Isolate] New isolate created: ${ISOLATE_ID}`);
		}

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
				isolateId: ISOLATE_ID,
			});
			console.log("[StreamableHTTP] Full request body:", JSON.stringify(body));

			// Create or resume the session **before** delivering the message
			let sid = reqSid;
			let session = sid ? sessions.get(sid) : undefined;
			console.log("[Session] get", {
				sid: reqSid,
				has: !!session,
				method: body.method,
				isolate: ISOLATE_ID,
			});

			// Get user ID for KV operations
			const userId = this.userProps.claims?.sub || this.userProps.claims?.email;
			const initCacheKey = userId ? `mcp:init:${userId}` : null;

			// Handle initialize - cache params for recovery
			if (body.method === "initialize") {
				if (initCacheKey && this.env.OAUTH_KV) {
					// Cache the initialize params for session recovery
					await this.env.OAUTH_KV.put(
						initCacheKey,
						JSON.stringify(body.params),
						{ expirationTtl: 86400 }, // 24 hours
					);
					console.log("[StreamableHTTP] Cached initialize params for user:", userId);
				}
			}

			// Helper: per-SID creation barrier
			async function getOrCreateSession(
				sId: string,
				factory: () => Promise<Session>,
			): Promise<Session> {
				const existing = sessions.get(sId);
				if (existing) return existing;
				let p = creatingSessions.get(sId);
				if (!p) {
					p = (async () => {
						const s = await factory();
						sessions.set(sId, s);
						return s;
					})().finally(() => creatingSessions.delete(sId));
					creatingSessions.set(sId, p);
				}
				return p;
			}

			// Only create new session for initialize or if no session exists
			// CRITICAL: Preserve the client's session ID instead of generating a new one
			if (body.method === "initialize" || !session) {
				// Use the client's SID if provided, otherwise generate new one
				sid = sid || crypto.randomUUID();
				session = await getOrCreateSession(sid, async () => {
					console.log("[Session] create", {
						sid,
						method: body.method,
						isolate: ISOLATE_ID,
					});
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
					// Create transport once for the session
					const transport = new SimpleJSONRPCTransport(this.env, sid);
					await transport.start();
					await server.connect(transport);

					// Notify client about tool list after connect
					try {
						await (server as any).server?.sendToolListChanged?.();
						console.log("[StreamableHTTP] Notified tool list changed after connect");
					} catch (e) {
						console.log("[StreamableHTTP] Tool list change notify not available:", e);
					}

					// Log registered tools for debugging
					const tools = Array.from((server as any).tools?.keys?.() ?? []);
					console.log("[StreamableHTTP] Registered tools post-connect:", tools);

					return { server, transport, last: Date.now() } as Session;
				});
			}
			if (session) session.last = Date.now();
			gcSessions();

			// Base headers for all responses
			const baseHeaders: Record<string, string> = {
				"Content-Type": "application/json",
				"Access-Control-Allow-Origin": request.headers.get("Origin") || "*",
				"Access-Control-Allow-Methods": "POST, OPTIONS",
				"Access-Control-Allow-Headers":
					request.headers.get("Access-Control-Request-Headers") ||
					"Content-Type, Authorization, Accept, Mcp-Session-Id",
				Vary: "Origin, Access-Control-Request-Headers",
			};
			if (sid) baseHeaders["Mcp-Session-Id"] = sid;

			// If it's a JSON-RPC notification, deliver it and return 202 immediately
			if (!("id" in body) || body.id === undefined || body.id === null) {
				if (session) {
					// Deliver to server without waiting for any response using session transport
					session.transport.onmessage?.(body as JSONRPCRequest);
					console.log("[StreamableHTTP] Handled notification:", body.method);
				} else {
					console.log("[StreamableHTTP] Dropped notification on unknown session");
				}
				return new Response(null, {
					status: 202,
					headers: { ...baseHeaders },
				});
			}

			// Non-initialize requests must run only on initialized sessions
			const ensureInitialized = async (s: Session) => {
				if (s.initialized) return;
				if (s.initInFlight) {
					await s.initInFlight;
					return;
				}
				if (!initCacheKey || !this.env.OAUTH_KV) return; // no way to init here
				const hasCached = await this.env.OAUTH_KV.get(initCacheKey);
				console.log("[Init] ensure", { sid, hasCached: !!hasCached });
				const cachedParams = await this.env.OAUTH_KV.get(initCacheKey, "json");
				if (!cachedParams) return; // still not available
				s.initInFlight = (async () => {
					const initReq: JSONRPCRequest = {
						jsonrpc: "2.0",
						method: "initialize",
						params: cachedParams as Record<string, unknown>,
						id: `init:${crypto.randomUUID()}`,
					};
					const r = await s.transport.handleRequest(initReq);
					if (r && !("error" in r)) s.initialized = true;
				})();
				try {
					await s.initInFlight;
				} finally {
					s.initInFlight = undefined;
				}
			};

			if (body.method !== "initialize") {
				if (session) {
					await ensureInitialized(session);
				}
				if (!session || !session.initialized) {
					const notInit: JSONRPCResponse = {
						jsonrpc: "2.0",
						error: {
							code: -32002,
							message: "Session not initialized. Call initialize first.",
						},
						id: body.id ?? null,
					};
					return new Response(JSON.stringify(notInit), { headers: { ...baseHeaders } });
				}
			}

			// Create and register AbortController for this request
			const key = String(body.id);
			const ac = new AbortController();
			session!.transport.registerAborter(key, ac);

			// Expose abort signal and deadline to tool layer via env
			(this.env as any).__CURRENT_ABORT_SIGNAL = ac.signal;
			const v = (this.env as any)?.MCP_REQUEST_TIMEOUT_MS;
			const n = typeof v === "string" ? parseInt(v, 10) : typeof v === "number" ? v : NaN;
			const timeoutMs = Number.isFinite(n) && n > 0 ? n : 25000;
			(this.env as any).__CURRENT_DEADLINE_TS = Date.now() + timeoutMs - 250; // 250ms buffer

			// Handle regular request with response using session transport
			const response = await session!.transport.handleRequest(body);

			// Clean up env properties
			delete (this.env as any).__CURRENT_ABORT_SIGNAL;
			delete (this.env as any).__CURRENT_DEADLINE_TS;

			// Mark session initialized on successful initialize
			if (body.method === "initialize" && response && !("error" in response)) {
				if (session) session.initialized = true;
			}

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
