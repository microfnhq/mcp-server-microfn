import { createMcpServer } from "./mcpServerFactory.js";
import type { UserProps } from "./types.js";
import type { Env } from "./index.js";
import type { JSONRPCMessage, JSONRPCRequest } from "@modelcontextprotocol/sdk/types.js";

// Define a more flexible JSONRPCResponse type that handles both success and error cases
type JSONRPCResponse = {
	jsonrpc: "2.0";
	id: string | number | null;
} & (
	| { result: any; error?: never }
	| { error: { code: number; message: string; data?: any }; result?: never }
);

/**
 * Simple JSON-RPC transport for Cloudflare Workers
 * Implements a basic request/response pattern without streaming
 */
class SimpleJSONRPCTransport {
	private messageHandler?: (message: JSONRPCMessage) => void;
	private responsePromise?: Promise<JSONRPCResponse>;
	private responseResolver?: (response: JSONRPCResponse) => void;

	onmessage?: (message: JSONRPCMessage) => void;
	onerror?: (error: Error) => void;
	onclose?: () => void;

	async start(): Promise<void> {
		// No-op for simple transport
	}

	async close(): Promise<void> {
		this.onclose?.();
	}

	async send(message: JSONRPCMessage): Promise<void> {
		// Store the response for the client
		if ("id" in message && message.id !== null) {
			if (this.responseResolver) {
				this.responseResolver(message as JSONRPCResponse);
			}
		}
	}

	/**
	 * Handle an incoming request and return the response
	 */
	async handleRequest(request: JSONRPCRequest): Promise<JSONRPCResponse | null> {
		return new Promise((resolve) => {
			this.responseResolver = resolve;
			this.onmessage?.(request);

			// Set a timeout to prevent hanging
			setTimeout(() => {
				resolve({
					jsonrpc: "2.0",
					error: {
						code: -32603,
						message: "Request timeout",
					},
					id: request.id ?? null,
				});
			}, 30000); // 30 second timeout
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
		try {
			console.log("[StreamableHTTP] Handle called with userProps:", {
				hasTokenSet: !!this.userProps.tokenSet,
				hasMicrofnToken: !!this.userProps.microfnToken,
				userEmail: this.userProps.claims?.email,
				userSub: this.userProps.claims?.sub,
				method: request.method,
			});

			const apiToken = this.userProps.microfnToken;

			if (!apiToken) {
				console.error(
					"[StreamableHTTP] No MicroFn PAT available for user:",
					this.userProps.claims?.email,
				);
				console.error("[StreamableHTTP] UserProps:", {
					microfnToken: this.userProps.microfnToken,
					tokenSet: this.userProps.tokenSet,
					claims: this.userProps.claims,
				});
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: 401,
							message: "No MicroFn API token available. Please re-authenticate.",
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
			console.log("[StreamableHTTP] Token prefix:", apiToken.substring(0, 10) + "...");

			// Handle GET requests to establish session
			if (request.method === "GET") {
				// Return a simple response indicating the session is established
				return new Response(
					JSON.stringify({
						message: "MCP streamable-http endpoint ready",
						authenticated: true,
						user: this.userProps.claims.email,
					}),
					{
						headers: {
							"Content-Type": "application/json",
						},
					},
				);
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
			});
			console.log("[StreamableHTTP] Full request body:", JSON.stringify(body));

			// Create transport
			const transport = new SimpleJSONRPCTransport();

			// Create server instance for this request
			const server = createMcpServer(apiToken, this.userProps, this.env);

			// Connect server to transport
			await server.connect(transport);

			// Handle the request and get response
			const response = await transport.handleRequest(body);

			// Close the transport
			await transport.close();

			// Return the response
			if (response) {
				return new Response(JSON.stringify(response), {
					headers: {
						"Content-Type": "application/json",
					},
				});
			} else {
				// No response (notification)
				return new Response("", { status: 204 });
			}
		} catch (error) {
			console.error("[StreamableHTTP] Error handling request:", error);
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
