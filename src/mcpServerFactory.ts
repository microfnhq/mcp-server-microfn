import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { UserProps } from "./types.js";
import type { Env } from "./index.js";
import type { WorkspaceCache, WorkspaceInfo } from "./workspaceCache.js";

// Import all tool handlers
import { handleCheckDeployment } from "./tools/checkDeployment.js";
import { handleCreateFunction } from "./tools/createFunction.js";
import { handleCreateSecret } from "./tools/createSecret.js";
import { handleDeleteSecret } from "./tools/deleteSecret.js";
import { handleExecuteFunction } from "./tools/executeFunction.js";
import { handleGenerateFunction } from "./tools/generateFunction.js";
import { handleGetFunctionCode } from "./tools/getFunctionCode.js";
import { handleGetSecrets } from "./tools/getSecrets.js";
import { handleInstallPackage } from "./tools/installPackage.js";
import { handleListFunctions } from "./tools/listFunctions.js";
import { handleListPackages } from "./tools/listPackages.js";
import { handleRemovePackage } from "./tools/removePackage.js";
import { handleRenameFunction } from "./tools/renameFunction.js";
import { handleRewriteFunction } from "./tools/rewriteFunction.js";
import { handleUpdateFunctionCode } from "./tools/updateFunctionCode.js";
import { handleUpdatePackage } from "./tools/updatePackage.js";
import { handleUpdatePackageLayer } from "./tools/updatePackageLayer.js";

/**
 * Creates and configures an MCP server instance with all MicroFn tools
 * This factory is shared between SSE and Streamable-HTTP transports
 */
export function createMcpServer(
	apiToken: string,
	props: UserProps,
	env: Env,
	updateToolsCallback?: (tools: Map<string, any>) => void,
	workspaceCache?: WorkspaceCache,
): McpServer {
	console.log("[mcpServerFactory] Creating MCP server:", {
		hasApiToken: !!apiToken,
		tokenPrefix: apiToken ? apiToken.substring(0, 10) + "..." : "none",
		userEmail: props.claims?.email,
		userSub: props.claims?.sub,
	});

	const server = new McpServer({
		name: "MicroFn MCP Server",
		version: "1.0.0",
	});

	const toolRefs = new Map<string, any>();

	// Debug tool to show current user info
	server.tool("whoami", "Get the current user's details", {}, async (extra: any) => {
		console.log("[mcpServerFactory] whoami called - extra:", extra);
		return {
			content: [
				{
					type: "text",
					text: JSON.stringify(
						{
							email: props.claims?.email,
							sub: props.claims?.sub,
							name: props.claims?.name,
							hasMicrofnToken: !!apiToken,
							tokenPrefix: apiToken ? apiToken.substring(0, 10) + "..." : "none",
							debug: {
								extra_type: typeof extra,
								extra_keys: extra ? Object.keys(extra) : null,
							},
						},
						null,
						2,
					),
				},
			],
		};
	});

	// Ping tool
	server.tool("ping", "Simple ping tool to test connectivity", {}, async (extra: any) => {
		console.log("[mcpServerFactory] ping - extra:", extra);
		return {
			content: [{ type: "text", text: "pong" }],
		};
	});

	// Test tool with parameters
	server.tool(
		"testParams",
		"Test tool to debug parameter passing",
		{
			testParam: z.string().describe("A test parameter"),
		},
		async ({ testParam }) => {
			console.log("[mcpServerFactory] testParams called with testParam:", testParam);

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								received: {
									testParam,
								},
							},
							null,
							2,
						),
					},
				],
			};
		},
	);

	// List functions
	const listFunctionsTool = server.tool(
		"listFunctions",
		'List all available MicroFn workspaces/functions. Returns an array of workspaces where each workspace.id (a UUID like "12345678-1234-5678-1234-567812345678") can be used as functionId parameter in other tools.',
		{},
		async (extra: any) => {
			console.log("[mcpServerFactory] listFunctions called with extra:", extra);
			console.log("[mcpServerFactory] listFunctions details:", {
				hasApiToken: !!apiToken,
				tokenPrefix: apiToken ? apiToken.substring(0, 10) + "..." : "none",
			});

			try {
				const result = await handleListFunctions(apiToken, {}, env, {} as ExecutionContext);
				console.log("[mcpServerFactory] listFunctions result:", {
					hasError: !!result.error,
					workspaceCount: result.workspaces?.length || 0,
				});

				// Update cache if we have workspaceCache
				if (workspaceCache && result.workspaces && Array.isArray(result.workspaces)) {
					console.log(
						"[mcpServerFactory] Updating workspace cache with",
						result.workspaces.length,
						"workspaces",
					);
					const workspaceInfos: WorkspaceInfo[] = result.workspaces.map((ws) => ({
						id: ws.id,
						name: ws.name,
					}));
					await workspaceCache.updateCache(workspaceInfos);
				}

				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				console.error("[mcpServerFactory] listFunctions error:", error.message);
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);
	toolRefs.set("listFunctions", listFunctionsTool);

	// Check deployment
	server.tool(
		"checkDeployment",
		"Check the deployment status of a function. Requires functionId parameter.",
		{
			functionId: z
				.string()
				.uuid()
				.describe(
					'The UUID of the function/workspace to check deployment status (e.g., "12345678-1234-5678-1234-567812345678")',
				),
		},
		async ({ functionId }) => {
			console.log("[mcpServerFactory] checkDeployment called with functionId:", functionId);

			try {
				const result = await handleCheckDeployment(
					apiToken,
					{ functionId },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Create function
	server.tool(
		"createFunction",
		"Create a new MicroFn workspace/function with TypeScript code. The code must contain an exported 'main' function that serves as the entry point. Input: 'name' (string) - the function name, 'code' (string) - TypeScript code with 'export async function main(params) { ... }' or 'export function main(params) { ... }'. The main function can take parameters and return JSON data or strings. Use @microfn/secret for environment variables, @microfn/kv for data storage. Output: Returns the created workspace object with id, name, and metadata.",
		{
			name: z.string().describe("The name for the new function/workspace"),
			code: z
				.string()
				.describe(
					"TypeScript code that must include 'export async function main(params) { ... }' or 'export function main(params) { ... }' as the entry point. Use @microfn/secret for env vars, @microfn/kv for storage.",
				),
		},
		async ({ name, code }) => {
			try {
				const result = await handleCreateFunction(
					apiToken,
					{ name, code },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Execute function
	const executeFunctionTool = server.tool(
		"executeFunction",
		"Execute a function with given input. Requires functionId and optional inputData parameters.",
		{
			functionId: z
				.string()
				.uuid()
				.describe(
					'The UUID of the function/workspace to execute (e.g., "12345678-1234-5678-1234-567812345678")',
				),
			inputData: z
				.object({})
				.passthrough()
				.optional()
				.describe("Optional input data to pass to the function"),
		},
		async ({ functionId, inputData }) => {
			console.log("[mcpServerFactory] executeFunction called:", {
				functionId,
				inputData,
			});

			try {
				const result = await handleExecuteFunction(
					apiToken,
					{ functionId, inputData },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);
	toolRefs.set("executeFunction", executeFunctionTool);

	// Get function code
	const getFunctionCodeTool = server.tool(
		"getFunctionCode",
		"Get the source code of a function. Requires functionId parameter (NOT workspace).",
		{
			functionId: z
				.string()
				.uuid()
				.describe(
					'The UUID of the function/workspace to retrieve code from (e.g., "12345678-1234-5678-1234-567812345678"). This must be a UUID, not a workspace name or slug.',
				),
		},
		async ({ functionId }) => {
			console.log("[mcpServerFactory] getFunctionCode called with functionId:", functionId);

			try {
				const result = await handleGetFunctionCode(
					apiToken,
					{ functionId },
					env,
					{} as ExecutionContext,
				);
				console.log("[mcpServerFactory] getFunctionCode result:", {
					hasError: !!result.error,
					hasCode: !!result.code,
				});
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				console.error("[mcpServerFactory] getFunctionCode error:", error.message);
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);
	toolRefs.set("getFunctionCode", getFunctionCodeTool);

	// Update function code
	server.tool(
		"updateFunctionCode",
		"Update the source code of a function. Requires functionId and code parameters.",
		{
			functionId: z
				.string()
				.uuid()
				.describe(
					'The UUID of the function/workspace to update (e.g., "12345678-1234-5678-1234-567812345678")',
				),
			code: z.string().describe("The new source code for the function"),
		},
		async ({ functionId, code }) => {
			console.log("[mcpServerFactory] updateFunctionCode called:", {
				functionId,
				codeLength: code?.length,
			});

			try {
				const result = await handleUpdateFunctionCode(
					apiToken,
					{ functionId, code },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// List packages
	server.tool(
		"listPackages",
		"Lists all npm packages installed for a function. Requires functionId parameter.",
		{
			functionId: z
				.string()
				.uuid()
				.describe(
					'The UUID of the function/workspace to list packages for (e.g., "12345678-1234-5678-1234-567812345678")',
				),
		},
		async ({ functionId }) => {
			console.log("[mcpServerFactory] listPackages called with functionId:", functionId);

			try {
				const result = await handleListPackages(
					apiToken,
					{ functionId },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Install package
	server.tool(
		"installPackage",
		"Installs an npm package for a function",
		{
			functionId: z.string(),
			name: z.string(),
			version: z.string(),
		},
		async ({ functionId, name, version }) => {
			try {
				const result = await handleInstallPackage(
					apiToken,
					{ functionId, name, version },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Update package
	server.tool(
		"updatePackage",
		"Updates an npm package version for a function",
		{
			functionId: z.string(),
			name: z.string(),
			version: z.string(),
		},
		async ({ functionId, name, version }) => {
			try {
				const result = await handleUpdatePackage(
					apiToken,
					{ functionId, name, version },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Remove package
	server.tool(
		"removePackage",
		"Removes an npm package from a function",
		{
			functionId: z.string(),
			name: z.string(),
		},
		async ({ functionId, name }) => {
			try {
				const result = await handleRemovePackage(
					apiToken,
					{ functionId, name },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Update package layer
	server.tool(
		"updatePackageLayer",
		"Updates the Lambda layer with the function's packages",
		{
			functionId: z.string(),
		},
		async ({ functionId }) => {
			try {
				const result = await handleUpdatePackageLayer(
					apiToken,
					{ functionId },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Rename function
	server.tool(
		"renameFunction",
		"Rename a function/workspace",
		{
			functionId: z.string(),
			newName: z.string(),
		},
		async ({ functionId, newName }) => {
			try {
				const result = await handleRenameFunction(
					apiToken,
					{ functionId, newName },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Get secrets
	server.tool(
		"getSecrets",
		"Retrieves all secrets for the specified function (workspace)",
		{
			workspaceId: z
				.string()
				.uuid()
				.describe(
					'The UUID of the workspace/function (e.g., "12345678-1234-5678-1234-567812345678")',
				),
		},
		async ({ workspaceId }) => {
			try {
				const result = await handleGetSecrets(
					apiToken,
					{ workspaceId },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Create secret
	server.tool(
		"createSecret",
		"Creates a new secret for the specified function (workspace). Secrets cannot be overwritten - delete first if key exists.",
		{
			workspaceId: z
				.string()
				.uuid()
				.describe(
					'The UUID of the workspace/function (e.g., "12345678-1234-5678-1234-567812345678")',
				),
			key: z.string(),
			value: z.string(),
		},
		async ({ workspaceId, key, value }) => {
			try {
				const result = await handleCreateSecret(
					apiToken,
					{ workspaceId, key, value },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Delete secret
	server.tool(
		"deleteSecret",
		"Deletes a secret from the specified function (workspace)",
		{
			workspaceId: z
				.string()
				.uuid()
				.describe(
					'The UUID of the workspace/function (e.g., "12345678-1234-5678-1234-567812345678")',
				),
			secretId: z.string().describe("The ID of the secret to delete"),
		},
		async ({ workspaceId, secretId }) => {
			try {
				const result = await handleDeleteSecret(
					apiToken,
					{ workspaceId, secretId },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Generate function
	server.tool(
		"generateFunction",
		"Generate multiple TypeScript function code variations using AI based on a natural language prompt. Input: 'prompt' (string, 1-500 chars) - describe what you want the function to do. Examples: 'a function that fetches weather data for a city', 'calculate fibonacci numbers', 'send an email notification', 'process CSV data and return statistics', 'convert markdown to HTML'. Output: Returns an object with 'variations' array containing multiple generated code snippets, each with a 'code' field containing complete TypeScript functions ready for MicroFn (with proper exports, @microfn modules, etc.).",
		{
			prompt: z
				.string()
				.min(1)
				.max(500)
				.describe(
					"Natural language description of what the function should do. Examples: 'fetch weather for a city', 'calculate compound interest', 'resize an image', 'parse JSON and extract specific fields'",
				),
		},
		async ({ prompt }) => {
			console.log("[mcpServerFactory] generateFunction called with prompt:", prompt);

			try {
				const result = await handleGenerateFunction(
					apiToken,
					{ prompt },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Rewrite function
	server.tool(
		"rewriteFunction",
		"Transform existing JavaScript/Node.js code to be fully compatible with the MicroFn serverless platform using AI. Input: 'code' (string) - any JavaScript/Node.js code that needs to be converted. This tool automatically converts: process.env.* → @microfn/secret.getRequired(), file system operations → @microfn/kv storage, module.exports → export function main(), require() → import statements, localStorage/global variables → @microfn/kv persistence, and ensures proper TypeScript formatting with exported main() function. Perfect for migrating existing scripts, functions, or code snippets to run on MicroFn. Output: Returns an object with 'code' field containing the fully rewritten TypeScript code ready to use in MicroFn.",
		{
			code: z
				.string()
				.min(1)
				.describe(
					"JavaScript/Node.js code to convert to MicroFn format. Can be any JS code - functions, scripts, modules, etc. Will be transformed to use @microfn modules and proper export structure.",
				),
		},
		async ({ code }) => {
			console.log("[mcpServerFactory] rewriteFunction called with code length:", code.length);

			try {
				const result = await handleRewriteFunction(
					apiToken,
					{ code },
					env,
					{} as ExecutionContext,
				);
				return { content: [{ type: "text", text: JSON.stringify(result) }] };
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);

	// Debug tool to inspect tool descriptions
	server.tool(
		"inspectToolDescriptions",
		"Debug tool to inspect current tool descriptions and see if workspace cache is working",
		{},
		async () => {
			const toolDescriptions: Record<string, string> = {};

			// Get descriptions for key tools
			const toolsToInspect = [
				"executeFunction",
				"getFunctionCode",
				"updateFunctionCode",
				"listPackages",
			];

			for (const toolName of toolsToInspect) {
				const tool = toolRefs.get(toolName);
				if (tool) {
					// Access the tool's description property
					toolDescriptions[toolName] = (tool as any).description || "No description";
				}
			}

			// Also check cache status
			let cacheInfo = { hasCache: false, workspaceCount: 0 };
			if (workspaceCache) {
				const cached = await workspaceCache.getCached();
				cacheInfo = {
					hasCache: !!cached,
					workspaceCount: cached?.length || 0,
				};
			}

			return {
				content: [
					{
						type: "text",
						text: JSON.stringify(
							{
								toolDescriptions,
								cacheInfo,
								timestamp: new Date().toISOString(),
							},
							null,
							2,
						),
					},
				],
			};
		},
	);

	// Call the callback if provided to pass tool references
	if (updateToolsCallback) {
		updateToolsCallback(toolRefs);
	}

	return server;
}
