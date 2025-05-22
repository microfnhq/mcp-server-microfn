import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

import { handleCheckDeployment } from "./tools/checkDeployment";
import { handleCreateFunction } from "./tools/createFunction";
import { handleExecuteFunction } from "./tools/executeFunction";
import { handleGetFunctionCode } from "./tools/getFunctionCode";
import { handleListFunctions } from "./tools/listFunctions";
import { handlePackageManager } from "./tools/packageManagement";
import { handlePing } from "./tools/ping";
import { handleRenameFunction } from "./tools/renameFunction";
import { handleSecretManagement } from "./tools/secretManagement";
import { handleUpdateFunctionCode } from "./tools/updateFunctionCode";
/**
 * Tool schemas for tools_json SSE event.
 */
const toolSchemas = [
	{
		name: "checkDeployment",
		description: "Fetches deployment details for a given functionId.",
		parameters: {
			type: "object",
			properties: {
				functionId: {
					type: "string",
					description: "ID of the function to check deployment for",
				},
			},
			required: ["functionId"],
		},
	},
	{
		name: "createFunction",
		description: "Creates a new function in the MicroFn workspace.",
		parameters: {
			type: "object",
			properties: {
				name: { type: "string", description: "Name of the function" },
				code: { type: "string", description: "Function code" },
			},
			required: ["name", "code"],
		},
	},
	{
		name: "executeFunction",
		description: "Executes a function by ID with optional input.",
		parameters: {
			type: "object",
			properties: {
				functionId: {
					type: "string",
					description: "ID of the function to execute",
				},
				input: {
					type: "string",
					description: "Input to the function",
					nullable: true,
				},
			},
			required: ["functionId"],
		},
	},
	{
		name: "getFunctionCode",
		description: "Retrieves the code for a given function ID.",
		parameters: {
			type: "object",
			properties: {
				functionId: { type: "string", description: "ID of the function" },
			},
			required: ["functionId"],
		},
	},
	{
		name: "listFunctions",
		description: "Lists all functions in the MicroFn workspace.",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
	{
		name: "packageManager",
		description: "Manages packages for a function (install, uninstall, list).",
		parameters: {
			type: "object",
			properties: {
				functionId: { type: "string", description: "ID of the function" },
				action: {
					type: "string",
					description: "Action to perform (install, uninstall, list)",
				},
				package: {
					type: "string",
					description: "Package name (for install/uninstall)",
					nullable: true,
				},
			},
			required: ["functionId", "action"],
		},
	},
	{
		name: "ping",
		description: "Health check for the MCP server.",
		parameters: {
			type: "object",
			properties: {},
			required: [],
		},
	},
	{
		name: "renameFunction",
		description: "Renames a function by ID.",
		parameters: {
			type: "object",
			properties: {
				functionId: { type: "string", description: "ID of the function" },
				newName: { type: "string", description: "New name for the function" },
			},
			required: ["functionId", "newName"],
		},
	},
	{
		name: "secretManagement",
		description: "Manages secrets for a function (set, get, delete).",
		parameters: {
			type: "object",
			properties: {
				functionId: { type: "string", description: "ID of the function" },
				action: {
					type: "string",
					description: "Action to perform (set, get, delete)",
				},
				key: { type: "string", description: "Secret key" },
				value: {
					type: "string",
					description: "Secret value (for set)",
					nullable: true,
				},
			},
			required: ["functionId", "action", "key"],
		},
	},
	{
		name: "updateFunctionCode",
		description: "Updates the code for a given function ID.",
		parameters: {
			type: "object",
			properties: {
				functionId: { type: "string", description: "ID of the function" },
				code: { type: "string", description: "New function code" },
			},
			required: ["functionId", "code"],
		},
	},
];
// Environment typings for the Durable Object
export interface MyDurableObjectEnv {
	MICROFN_API_TOKEN: string;
	// Add other Durable Object bindings or environment variables here if needed
}

// Interface for MicroFn workspace objects
interface Workspace {
	id: string;
	name: string;
	// Add other relevant fields based on the actual API response
	[key: string]: any; // Allow other properties
}

// MicroFn API Client
const MICROFN_RUN_BASE_URL = "https://microfn.dev";
const MICROFN_API_BASE_URL = `${MICROFN_RUN_BASE_URL}/api`;

class MicroFnAPIClient {
	private token: string;

	constructor(token: string) {
		if (!token) {
			throw new Error("API token cannot be empty.");
		}
		this.token = token;
	}

	private getHeaders(): HeadersInit {
		return {
			Authorization: `Bearer ${this.token}`,
			Accept: "application/json",
		};
	}

	async getWorkspaces(): Promise<Workspace[]> {
		const url = `${MICROFN_API_BASE_URL}/workspaces`;
		const response = await fetch(url, {
			method: "GET",
			headers: this.getHeaders(),
		});

		if (!response.ok) {
			const errorText = await response.text();
			console.error(
				`MicroFnAPIClient: Error fetching workspaces: ${response.status} ${errorText}`,
			);
			throw new Error(`MicroFnAPIClient: Failed to fetch workspaces - ${response.status}`);
		}
		const data = (await response.json()) as { workspaces?: Workspace[] };
		return data.workspaces || [];
	}
}

// Define our MCP agent with tools
export class MyMCP extends McpAgent<MyDurableObjectEnv> {
	server = new McpServer({
		name: "Authless Calculator",
		version: "1.0.0",
	});

	async init() {
		// Simple addition tool
		this.server.tool("add", { a: z.number(), b: z.number() }, async ({ a, b }) => ({
			content: [{ type: "text", text: String(a + b) }],
		}));

		// Calculator tool with multiple operations
		this.server.tool(
			"calculate",
			{
				operation: z.enum(["add", "subtract", "multiply", "divide"]),
				a: z.number(),
				b: z.number(),
			},
			async ({ operation, a, b }) => {
				let result: number;
				switch (operation) {
					case "add":
						result = a + b;
						break;
					case "subtract":
						result = a - b;
						break;
					case "multiply":
						result = a * b;
						break;
					case "divide":
						if (b === 0)
							return {
								content: [
									{
										type: "text",
										text: "Error: Cannot divide by zero",
									},
								],
							};
						result = a / b;
						break;
				}
				return { content: [{ type: "text", text: String(result) }] };
			},
		);

		// Ping tool
		this.server.tool(
			"ping",
			{}, // No arguments
			async (_args: {}, _extra: any) => ({
				content: [{ type: "text", text: "pong" }],
			}),
		);

		// List functions tool
		this.server.tool(
			"list_functions",
			{}, // No arguments
			async (_args: {}, extra: any) => {
				// Prefer Authorization header if present, else fall back to env
				let token: string | undefined;
				const req: Request | undefined = extra?.request;
				if (req) {
					const authHeader =
						req.headers.get("authorization") || req.headers.get("Authorization");
					if (authHeader && authHeader.startsWith("Bearer ")) {
						token = authHeader.slice("Bearer ".length).trim();
					}
				}
				if (!token) {
					const env = extra.env || {};
					token = env.MICROFN_API_TOKEN;
				}
				if (!token) {
					console.error("No API token found in Authorization header or environment.");
					return {
						content: [
							{
								type: "text",
								text: "Error: MICROFN_API_TOKEN is not configured and no Authorization header was provided.",
							},
						],
					};
				}
				try {
					const client = new MicroFnAPIClient(token);
					const workspaces = await client.getWorkspaces();
					return {
						structuredContent: { workspaces },
					};
				} catch (error: any) {
					console.error(`Error in list_functions tool: ${error.message}`);
					return {
						content: [
							{
								type: "text",
								text: `Error executing list_functions: ${error.message}`,
							},
						],
						structuredContent: {},
					};
				}
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		console.log("[MCP] Fetch handler entry", {
			url: request.url,
			method: request.method,
			headers: Object.fromEntries(request.headers.entries()),
		});
		const url = new URL(request.url);

		if (url.pathname === "/sse") {
			console.log("[MCP] Handling /sse endpoint");
			// Extract Bearer token from Authorization header
			const authHeader =
				request.headers.get("authorization") || request.headers.get("Authorization");
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				console.error("[MCP] Missing or malformed Authorization header for /sse");
				// SSE error event format
				const encoder = new TextEncoder();
				const errorEvent = encoder.encode(
					`event: error\ndata: ${JSON.stringify({
						error: "Missing or malformed Authorization header",
						code: 401,
					})}\n\n`,
				);
				return new Response(errorEvent, {
					status: 401,
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			}
			const apiToken = authHeader.slice("Bearer ".length).trim();
			if (!apiToken) {
				console.error("[MCP] Empty API token for /sse");
				const encoder = new TextEncoder();
				const errorEvent = encoder.encode(
					`event: error\ndata: ${JSON.stringify({
						error: "Empty API token",
						code: 401,
					})}\n\n`,
				);
				return new Response(errorEvent, {
					status: 401,
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			}
			// Patch env with token for downstream handlers
			const patchedEnv = { ...env, MICROFN_API_TOKEN: apiToken };

			// Directly delegate to MCP SDK SSE handler (no custom tools_json event)
			console.log("[MCP] Calling MyMCP.serveSSE(/sse).fetch (no custom stream)");
			return MyMCP.serveSSE("/sse").fetch(request, patchedEnv, ctx);
		}

		if (url.pathname === "/sse/message") {
			console.log("[MCP] Handling /sse/message endpoint");
			// For /sse/message, just delegate as before
			const authHeader =
				request.headers.get("authorization") || request.headers.get("Authorization");
			if (!authHeader || !authHeader.startsWith("Bearer ")) {
				console.error("[MCP] Missing or malformed Authorization header for /sse/message");
				// SSE error event format
				const encoder = new TextEncoder();
				const errorEvent = encoder.encode(
					`event: error\ndata: ${JSON.stringify({
						error: "Missing or malformed Authorization header",
						code: 401,
					})}\n\n`,
				);
				return new Response(errorEvent, {
					status: 401,
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			}
			const apiToken = authHeader.slice("Bearer ".length).trim();
			if (!apiToken) {
				console.error("[MCP] Empty API token for /sse/message");
				const encoder = new TextEncoder();
				const errorEvent = encoder.encode(
					`event: error\ndata: ${JSON.stringify({
						error: "Empty API token",
						code: 401,
					})}\n\n`,
				);
				return new Response(errorEvent, {
					status: 401,
					headers: {
						"Content-Type": "text/event-stream",
						"Cache-Control": "no-cache",
						Connection: "keep-alive",
					},
				});
			}
			// Patch env with token for downstream handlers
			const patchedEnv = { ...env, MICROFN_API_TOKEN: apiToken };
			return MyMCP.serveSSE("/sse/message").fetch(request, patchedEnv, ctx);
		}

		if (url.pathname === "/mcp") {
			console.log("[MCP] Handling /mcp endpoint");
			return MyMCP.serve("/mcp").fetch(request, env, ctx);
		}

		// === MCP Tool Handler Routing ===
		if (url.pathname === "/tool") {
			console.log("[MCP] Handling /tool endpoint");
			return (async () => {
				try {
					if (request.method !== "POST") {
						console.error("[MCP] /tool: Method Not Allowed", request.method);
						return new Response(
							JSON.stringify({ error: "Method Not Allowed", code: 405 }),
							{ status: 405, headers: { "Content-Type": "application/json" } },
						);
					}

					// Extract Bearer token from Authorization header
					const authHeader =
						request.headers.get("authorization") ||
						request.headers.get("Authorization");
					if (!authHeader || !authHeader.startsWith("Bearer ")) {
						console.error("[MCP] /tool: Missing or malformed Authorization header");
						return new Response(
							JSON.stringify({
								error: "Missing or malformed Authorization header",
								code: 401,
							}),
							{ status: 401, headers: { "Content-Type": "application/json" } },
						);
					}
					const apiToken = authHeader.slice("Bearer ".length).trim();
					if (!apiToken) {
						console.error("[MCP] /tool: Empty API token");
						return new Response(
							JSON.stringify({ error: "Empty API token", code: 401 }),
							{ status: 401, headers: { "Content-Type": "application/json" } },
						);
					}

					let body: any;
					try {
						body = await request.json();
						console.log("[MCP] /tool: Parsed request body", body);
					} catch (err) {
						console.error("[MCP] /tool: Invalid JSON body", err);
						return new Response(
							JSON.stringify({ error: "Invalid JSON body", code: 400 }),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					const toolName = body.tool_name || body.method;
					if (!toolName) {
						console.error("[MCP] /tool: Missing tool_name or method");
						return new Response(
							JSON.stringify({
								error: "Missing tool_name or method",
								code: 400,
							}),
							{ status: 400, headers: { "Content-Type": "application/json" } },
						);
					}

					// Static tool handlers map
					const toolHandlers: Record<
						string,
						(
							token: string,
							params: any,
							env: any,
							ctx: ExecutionContext,
						) => Promise<any>
					> = {
						checkDeployment: handleCheckDeployment,
						createFunction: handleCreateFunction,
						executeFunction: handleExecuteFunction,
						getFunctionCode: handleGetFunctionCode,
						listFunctions: handleListFunctions,
						packageManager: handlePackageManager,

						renameFunction: handleRenameFunction,
						secretManagement: handleSecretManagement,
						updateFunctionCode: handleUpdateFunctionCode,
					};

					const handler = toolHandlers[toolName];
					if (!handler) {
						console.error(`[MCP] /tool: Unknown tool: ${toolName}`);
						return new Response(
							JSON.stringify({ error: `Unknown tool: ${toolName}`, code: 404 }),
							{ status: 404, headers: { "Content-Type": "application/json" } },
						);
					}

					let result;
					try {
						console.log(`[MCP] /tool: Invoking handler for ${toolName}`);
						result = await handler(apiToken, body.parameters ?? {}, env, ctx);
						console.log(`[MCP] /tool: Handler result for ${toolName}`, result);
					} catch (err: any) {
						console.error(`[MCP] /tool: Tool handler error for ${toolName}`, err);
						return new Response(
							JSON.stringify({
								error: err?.message || "Tool handler error",
								code: 500,
								details: err?.stack || undefined,
							}),
							{ status: 500, headers: { "Content-Type": "application/json" } },
						);
					}

					return new Response(JSON.stringify({ result }), {
						status: 200,
						headers: { "Content-Type": "application/json" },
					});
				} catch (err: any) {
					console.error("[MCP] /tool: Internal server error", err);
					return new Response(
						JSON.stringify({
							error: "Internal server error",
							code: 500,
							details: err?.stack || undefined,
						}),
						{ status: 500, headers: { "Content-Type": "application/json" } },
					);
				}
			})();
		}
		console.error("[MCP] Not found for path", url.pathname);
		return new Response("Not found", { status: 404 });
	},
};
