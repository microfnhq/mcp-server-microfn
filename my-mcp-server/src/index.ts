// MCP Server implementation with API tools
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

// Import the existing MicroFn API client
import { MicroFnApiClient, Workspace } from "./microfnApiClient";

// Tool handler functions
import { handleCheckDeployment } from "./tools/checkDeployment";
import { handleCreateFunction } from "./tools/createFunction";
import { handleExecuteFunction } from "./tools/executeFunction";
import { handleGetFunctionCode } from "./tools/getFunctionCode";
import { handleListFunctions } from "./tools/listFunctions";
import { handleListPackages } from "./tools/listPackages";
import { handleInstallPackage } from "./tools/installPackage";
import { handleUpdatePackage } from "./tools/updatePackage";
import { handleRemovePackage } from "./tools/removePackage";
import { handleUpdatePackageLayer } from "./tools/updatePackageLayer";
import { handleRenameFunction } from "./tools/renameFunction";
import { handleSecretManagement } from "./tools/secretManagement";
import { handleUpdateFunctionCode } from "./tools/updateFunctionCode";

// Environment interface
export interface Env {
	MICROFN_API_TOKEN?: string;
}

// Extract API token from request headers
function extractApiToken(request: Request): string | undefined {
	const authHeader = request.headers.get("authorization") || request.headers.get("Authorization");
	if (authHeader && authHeader.startsWith("Bearer ")) {
		return authHeader.slice("Bearer ".length).trim();
	}
	return undefined;
}

// MCP tool registry with direct API token access
interface McpTools {
	[key: string]: {
		description: string;
		inputSchema: any;
		handler: (args: any) => Promise<any>;
	};
}

function createMcpTools(apiToken: string): McpTools {
	return {
		ping: {
			description: "Simple ping tool to test connectivity",
			inputSchema: {
				type: "object",
				properties: {},
				required: [],
			},
			handler: async () => ({
				content: [{ type: "text", text: "pong" }],
			}),
		},

		list_functions: {
			description: "List all available MicroFn workspaces",
			inputSchema: {
				type: "object",
				properties: {},
				required: [],
			},
			handler: async () => {
				try {
					const result = await handleListFunctions(
						apiToken,
						{},
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [
							{
								type: "text",
								text: `Error: ${error.message}`,
							},
						],
					};
				}
			},
		},

		checkDeployment: {
			description: "Check the deployment status of a function",
			inputSchema: {
				type: "object",
				properties: {
					workspaceId: { type: "string" },
					functionName: { type: "string" },
				},
				required: ["workspaceId", "functionName"],
			},
			handler: async (args) => {
				try {
					const result = await handleCheckDeployment(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		createFunction: {
			description: "Create a new function",
			inputSchema: {
				type: "object",
				properties: {
					name: { type: "string" },
					code: { type: "string" },
				},
				required: ["name", "code"],
			},
			handler: async (args) => {
				try {
					const result = await handleCreateFunction(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		executeFunction: {
			description: "Execute a function with given input",
			inputSchema: {
				type: "object",
				properties: {
					functionId: { type: "string" },
					inputData: {},
				},
				required: ["functionId"],
			},
			handler: async (args) => {
				try {
					const result = await handleExecuteFunction(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		getFunctionCode: {
			description: "Get the source code of a function",
			inputSchema: {
				type: "object",
				properties: {
					functionId: { type: "string" },
				},
				required: ["functionId"],
			},
			handler: async (args) => {
				try {
					const result = await handleGetFunctionCode(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		updateFunctionCode: {
			description: "Update the source code of a function",
			inputSchema: {
				type: "object",
				properties: {
					functionId: { type: "string" },
					code: { type: "string" },
				},
				required: ["functionId", "code"],
			},
			handler: async (args) => {
				try {
					const result = await handleUpdateFunctionCode(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		listPackages: {
			description: "Lists all npm packages installed for a function",
			inputSchema: {
				type: "object",
				properties: {
					functionId: { type: "string" },
				},
				required: ["functionId"],
			},
			handler: async (args) => {
				try {
					const result = await handleListPackages(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		installPackage: {
			description: "Installs an npm package for a function",
			inputSchema: {
				type: "object",
				properties: {
					functionId: { type: "string" },
					name: { type: "string" },
					version: { type: "string" },
				},
				required: ["functionId", "name"],
			},
			handler: async (args) => {
				try {
					const result = await handleInstallPackage(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		updatePackage: {
			description: "Updates an npm package version for a function",
			inputSchema: {
				type: "object",
				properties: {
					functionId: { type: "string" },
					name: { type: "string" },
					version: { type: "string" },
				},
				required: ["functionId", "name"],
			},
			handler: async (args) => {
				try {
					const result = await handleUpdatePackage(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		removePackage: {
			description: "Removes an npm package from a function",
			inputSchema: {
				type: "object",
				properties: {
					functionId: { type: "string" },
					name: { type: "string" },
				},
				required: ["functionId", "name"],
			},
			handler: async (args) => {
				try {
					const result = await handleRemovePackage(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		updatePackageLayer: {
			description: "Updates the Lambda layer with the function's packages",
			inputSchema: {
				type: "object",
				properties: {
					functionId: { type: "string" },
				},
				required: ["functionId"],
			},
			handler: async (args) => {
				try {
					const result = await handleUpdatePackageLayer(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		renameFunction: {
			description: "Rename a function/workspace",
			inputSchema: {
				type: "object",
				properties: {
					functionId: { type: "string" },
					newName: { type: "string" },
				},
				required: ["functionId", "newName"],
			},
			handler: async (args) => {
				try {
					const result = await handleRenameFunction(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},

		secretManagement: {
			description: "Manage secrets for a function (create, list, delete)",
			inputSchema: {
				type: "object",
				properties: {
					workspaceId: { type: "string" },
					functionName: { type: "string" },
					action: { type: "string", enum: ["create", "list", "delete"] },
					secretName: { type: "string" },
					secretValue: { type: "string" },
				},
				required: ["workspaceId", "functionName", "action"],
			},
			handler: async (args) => {
				try {
					const result = await handleSecretManagement(
						apiToken,
						args,
						{},
						{} as ExecutionContext,
					);
					return { content: [{ type: "text", text: JSON.stringify(result) }] };
				} catch (error: any) {
					return {
						content: [{ type: "text", text: `Error: ${error.message}` }],
					};
				}
			},
		},
	};
}

// Export the default fetch handler
export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext) {
		console.log("[MCP] Fetch handler entry", {
			url: request.url,
			method: request.method,
			headers: Object.fromEntries(request.headers.entries()),
		});

		const url = new URL(request.url);

		// Handle MCP endpoint with direct JSON-RPC
		if (url.pathname === "/mcp") {
			console.log("[MCP] Handling /mcp endpoint");

			if (request.method !== "POST") {
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32000,
							message: "Method not allowed",
						},
						id: null,
					}),
					{
						status: 405,
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			try {
				// Extract API token from Authorization header
				const apiToken = extractApiToken(request);

				if (!apiToken) {
					console.error("[MCP] No API token found");
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							error: {
								code: -32000,
								message: "Missing or malformed Authorization header",
							},
							id: null,
						}),
						{
							status: 401,
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				// Parse JSON-RPC request
				let body: any;
				try {
					body = await request.json();
				} catch (error) {
					console.error("[MCP] Invalid JSON body:", error);
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
							headers: { "Content-Type": "application/json" },
						},
					);
				}

				console.log("[MCP] Received request:", body);

				// Handle MCP protocol methods
				const tools = createMcpTools(apiToken);

				if (body.method === "initialize") {
					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							result: {
								protocolVersion: "2024-11-05",
								capabilities: {
									tools: {},
								},
								serverInfo: {
									name: "MicroFn MCP Server",
									version: "1.0.0",
								},
							},
							id: body.id,
						}),
						{ headers: { "Content-Type": "application/json" } },
					);
				}

				if (body.method === "tools/list") {
					const toolList = Object.entries(tools).map(([name, tool]) => ({
						name,
						description: tool.description,
						inputSchema: tool.inputSchema,
					}));

					return new Response(
						JSON.stringify({
							jsonrpc: "2.0",
							result: {
								tools: toolList,
							},
							id: body.id,
						}),
						{ headers: { "Content-Type": "application/json" } },
					);
				}

				if (body.method === "tools/call") {
					const toolName = body.params?.name;
					const toolArgs = body.params?.arguments || {};

					if (!toolName || !tools[toolName]) {
						return new Response(
							JSON.stringify({
								jsonrpc: "2.0",
								error: {
									code: -32602,
									message: `Unknown tool: ${toolName}`,
								},
								id: body.id,
							}),
							{ headers: { "Content-Type": "application/json" } },
						);
					}

					try {
						const result = await tools[toolName].handler(toolArgs);
						return new Response(
							JSON.stringify({
								jsonrpc: "2.0",
								result,
								id: body.id,
							}),
							{ headers: { "Content-Type": "application/json" } },
						);
					} catch (error: any) {
						console.error(`[MCP] Tool error for ${toolName}:`, error);
						return new Response(
							JSON.stringify({
								jsonrpc: "2.0",
								error: {
									code: -32603,
									message: error.message || "Tool execution failed",
								},
								id: body.id,
							}),
							{ headers: { "Content-Type": "application/json" } },
						);
					}
				}

				// Handle notifications (no response needed)
				if (!body.id) {
					return new Response("", { status: 204 });
				}

				// Unknown method
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32601,
							message: "Method not found",
						},
						id: body.id,
					}),
					{ headers: { "Content-Type": "application/json" } },
				);
			} catch (error: any) {
				console.error("[MCP] Error handling MCP request:", error);
				return new Response(
					JSON.stringify({
						jsonrpc: "2.0",
						error: {
							code: -32603,
							message: "Internal server error",
						},
						id: null,
					}),
					{
						status: 500,
						headers: { "Content-Type": "application/json" },
					},
				);
			}
		}

		// Legacy tool endpoint for direct tool calls
		if (url.pathname === "/tool") {
			console.log("[MCP] Handling /tool endpoint");

			if (request.method !== "POST") {
				return new Response(JSON.stringify({ error: "Method Not Allowed", code: 405 }), {
					status: 405,
					headers: { "Content-Type": "application/json" },
				});
			}

			const apiToken = extractApiToken(request);
			if (!apiToken) {
				return new Response(
					JSON.stringify({
						error: "Missing or malformed Authorization header",
						code: 401,
					}),
					{ status: 401, headers: { "Content-Type": "application/json" } },
				);
			}

			try {
				const body: any = await request.json();
				const toolName = body.tool_name || body.method;

				if (!toolName) {
					return new Response(
						JSON.stringify({
							error: "Missing tool_name or method",
							code: 400,
						}),
						{ status: 400, headers: { "Content-Type": "application/json" } },
					);
				}

				// Tool handlers map
				const toolHandlers: Record<string, Function> = {
					checkDeployment: handleCheckDeployment,
					createFunction: handleCreateFunction,
					executeFunction: handleExecuteFunction,
					getFunctionCode: handleGetFunctionCode,
					listFunctions: handleListFunctions,
					listPackages: handleListPackages,
					installPackage: handleInstallPackage,
					updatePackage: handleUpdatePackage,
					removePackage: handleRemovePackage,
					updatePackageLayer: handleUpdatePackageLayer,
					renameFunction: handleRenameFunction,
					secretManagement: handleSecretManagement,
					updateFunctionCode: handleUpdateFunctionCode,
				};

				const handler = toolHandlers[toolName];
				if (!handler) {
					return new Response(
						JSON.stringify({ error: `Unknown tool: ${toolName}`, code: 404 }),
						{ status: 404, headers: { "Content-Type": "application/json" } },
					);
				}

				const result = await handler(apiToken, body.parameters ?? {}, env, ctx);
				return new Response(JSON.stringify({ result }), {
					status: 200,
					headers: { "Content-Type": "application/json" },
				});
			} catch (error: any) {
				console.error("[MCP] /tool error:", error);
				return new Response(
					JSON.stringify({
						error: error?.message || "Internal server error",
						code: 500,
					}),
					{ status: 500, headers: { "Content-Type": "application/json" } },
				);
			}
		}

		console.error("[MCP] Not found for path", url.pathname);
		return new Response("Not found", { status: 404 });
	},
};
