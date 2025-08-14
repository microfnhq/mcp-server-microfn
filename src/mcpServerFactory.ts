import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import type { UserProps } from "./types.js";
import { functionIdentifierSchema } from "./types.js";
import type { Env } from "./index.js";
import type { WorkspaceCache, WorkspaceInfo } from "./workspaceCache.js";
import { MicroFnApiClient, type Workspace } from "./microfnApiClient.js";
import type { UserDataCacheStub } from "./UserDataCache.js";

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
 * Updates tool descriptions with the list of available functions
 */
function updateToolDescriptions(workspaces: Workspace[], toolRefs: Map<string, RegisteredTool>) {
	console.log(
		"[mcpServerFactory] Updating tool descriptions with",
		workspaces.length,
		"workspaces",
	);

	if (workspaces.length === 0) {
		console.log("[mcpServerFactory] No workspaces to update descriptions with");
		return;
	}

	// Format function list with username/functionName pattern
	const functionList = workspaces
		.map((ws) => {
			const identifier = ws.Account?.username
				? `${ws.Account?.username}/${ws.name}`
				: ws.name;
			return `  - ${identifier}`;
		})
		.join("\n");

	// Update executeFunction tool
	const executeTool = toolRefs.get("executeFunction");
	if (executeTool) {
		const newDesc = `Execute a function with given input. Requires functionName (format: 'username/functionName') and optional inputData parameters.\n\nAvailable functions:\n${functionList}`;
		console.log("[mcpServerFactory] Updating executeFunction description");
		executeTool.update({ description: newDesc });
	}

	// Update getFunctionCode tool
	const getCodeTool = toolRefs.get("getFunctionCode");
	if (getCodeTool) {
		const newDesc = `Get the source code of a function. Requires functionName parameter in format 'username/functionName'.\n\nAvailable functions:\n${functionList}`;
		console.log("[mcpServerFactory] Updating getFunctionCode description");
		getCodeTool.update({ description: newDesc });
	}

	// Update updateFunctionCode tool
	const updateCodeTool = toolRefs.get("updateFunctionCode");
	if (updateCodeTool) {
		const newDesc = `Update the source code of a function. The code can export either: 1) A 'main' function directly, OR 2) Any named function (auto-wrapped). Requires functionName (format: 'username/functionName') and code parameters.\n\nAvailable functions:\n${functionList}`;
		console.log("[mcpServerFactory] Updating updateFunctionCode description");
		updateCodeTool.update({ description: newDesc });
	}

	// Update listPackages tool
	const listPackagesTool = toolRefs.get("listPackages");
	if (listPackagesTool) {
		const newDesc = `Lists all npm packages installed for a function. Requires functionName parameter in format 'username/functionName'.\n\nAvailable functions:\n${functionList}`;
		console.log("[mcpServerFactory] Updating listPackages description");
		listPackagesTool.update({ description: newDesc });
	}

	console.log("[mcpServerFactory] Tool descriptions updated");
}

/**
 * Creates and configures an MCP server instance with all MicroFn tools
 * This factory is shared between SSE and Streamable-HTTP transports
 */
export async function createMcpServer(
	apiToken: string,
	props: UserProps,
	env: Env,
	updateToolsCallback?: (tools: Map<string, any>) => void,
	workspaceCache?: WorkspaceCache,
	userCacheDO?: UserDataCacheStub,
): Promise<McpServer> {
	console.log("[mcpServerFactory] Creating MCP server:", {
		hasApiToken: !!apiToken,
		tokenType: "Auth0 ID Token",
		tokenPrefix: apiToken ? apiToken.substring(0, 10) + "..." : "none",
		userEmail: props.claims?.email,
		userSub: props.claims?.sub,
	});

	const server = new McpServer({
		name: "MicroFn MCP Server",
		version: "1.0.0",
	});

	const toolRefs = new Map<string, RegisteredTool>();
	const registeredDynamicTools = new Set<string>();

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
							hasAuth0IdToken: !!apiToken,
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
		"List all available MicroFn workspaces/functions. Returns an array of workspaces with username and name that can be used with other tools.",
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

				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
		"Check the deployment status of a function. Requires functionName parameter in format 'username/functionName'.",
		{
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
		},
		async ({ functionName }) => {
			console.log(
				"[mcpServerFactory] checkDeployment called with functionName:",
				functionName,
			);

			try {
				const result = await handleCheckDeployment(
					apiToken,
					{ functionName },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
		"Create a new MicroFn workspace/function with TypeScript code. The code must export either: 1) A 'main' function as the entry point, OR 2) Any named function (which will be auto-wrapped with a main function). Examples: 'export async function main() { return \"hello\" }', 'export async function sayHello(name) { return \"hello \" + name }' (auto-wrapped), 'export async function main() { const btc = await fetch(\"...\"); return btc.json() }'. IMPORTANT: Import @microfn/* modules as defaults: 'import kv from \"@microfn/kv\"' NOT 'import { kv } from \"@microfn/kv\"'. Common patterns: Use @microfn/secret for env vars, @microfn/kv for persistent storage (e.g., counters, cache), fetch() for HTTP requests. If unsure about syntax, use the 'rewriteFunction' tool to transform your code. Input: 'name' (string) - function name, 'code' (string) - TypeScript code. Output: Returns the created workspace object with id, name, and metadata.",
		{
			name: z.string().describe("The name for the new function/workspace"),
			code: z
				.string()
				.describe(
					"TypeScript code with exported function(s). Can be: 1) 'export async function main() {...}' for direct entry point, 2) 'export async function anyName() {...}' which auto-wraps with main(), 3) Multiple functions where main() calls others. Examples: Simple API call: 'export async function main() { const res = await fetch(\"https://api.example.com\"); return res.json(); }'. With KV storage: 'import kv from \"@microfn/kv\"; export async function main() { const count = (await kv.get(\"count\")) || 0; await kv.set(\"count\", count + 1); return count + 1; }'. ALWAYS use default imports for @microfn/* modules. If unsure, use 'rewriteFunction' tool.",
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
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
		"Execute a function with given input. Requires functionName (format: 'username/functionName') and optional inputData parameters.",
		{
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
			inputData: z
				.object({})
				.passthrough()
				.optional()
				.describe("Optional input data to pass to the function"),
		},
		async ({ functionName, inputData }) => {
			console.log("[mcpServerFactory] executeFunction called:", {
				functionName,
				inputData,
			});

			try {
				const result = await handleExecuteFunction(
					apiToken,
					{ functionName, inputData },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
		"Get the source code of a function. Requires functionName parameter in format 'username/functionName'.",
		{
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
		},
		async ({ functionName }) => {
			console.log(
				"[mcpServerFactory] getFunctionCode called with functionName:",
				functionName,
			);

			try {
				const result = await handleGetFunctionCode(
					apiToken,
					{ functionName },
					env,
					{} as ExecutionContext,
				);
				console.log("[mcpServerFactory] getFunctionCode result:", {
					hasError: !!result.error,
					hasCode: !!result.code,
				});
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
	const updateFunctionCodeTool = server.tool(
		"updateFunctionCode",
		"Update the source code of a function. The code can export either: 1) A 'main' function directly, OR 2) Any named function (auto-wrapped). Examples: Bitcoin price fetcher: 'export async function main() { const res = await fetch(\"https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd\"); return { price_usd: (await res.json()).bitcoin.usd }; }'. With KV counter: 'import kv from \"@microfn/kv\"; export async function main() { const count = (await kv.get(\"visits\")) || 0; await kv.set(\"visits\", count + 1); return { visits: count + 1 }; }'. IMPORTANT: Always use default imports for @microfn/* modules. If converting existing code, use 'rewriteFunction' tool first. Requires functionName (format: 'username/functionName') and code parameters.",
		{
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
			code: z
				.string()
				.describe(
					"The new TypeScript code. Can export: 1) 'export async function main() {...}' directly, OR 2) Any named exported function (gets auto-wrapped). Examples: Weather API: 'export async function getWeather() { const res = await fetch(\"https://wttr.in/Tokyo?format=3\"); return res.text(); }'. Timer with KV: 'import kv from \"@microfn/kv\"; export async function main() { const val = (await kv.get<number>(\"timer\")) || 0; await kv.set(\"timer\", val + 1); return val + 1; }'. ALWAYS use default imports for @microfn/* modules. If unsure, use 'rewriteFunction' tool first.",
				),
		},
		async ({ functionName, code }) => {
			console.log("[mcpServerFactory] updateFunctionCode called:", {
				functionName,
				codeLength: code?.length,
			});

			try {
				const result = await handleUpdateFunctionCode(
					apiToken,
					{ functionName, code },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);
	toolRefs.set("updateFunctionCode", updateFunctionCodeTool);

	// List packages
	const listPackagesTool = server.tool(
		"listPackages",
		"Lists all npm packages installed for a function. Requires functionName parameter in format 'username/functionName'.",
		{
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
		},
		async ({ functionName }) => {
			console.log("[mcpServerFactory] listPackages called with functionName:", functionName);

			try {
				const result = await handleListPackages(
					apiToken,
					{ functionName },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
			} catch (error: any) {
				return {
					content: [{ type: "text", text: `Error: ${error.message}` }],
				};
			}
		},
	);
	toolRefs.set("listPackages", listPackagesTool);

	// Install package
	server.tool(
		"installPackage",
		"Installs an npm package for a function. Requires functionName (format: 'username/functionName'), package name and version.",
		{
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
			name: z.string().describe("The npm package name to install"),
			version: z.string().describe("The package version to install"),
		},
		async ({ functionName, name, version }) => {
			try {
				const result = await handleInstallPackage(
					apiToken,
					{ functionName, name, version },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
			name: z.string().describe("The npm package name to update"),
			version: z.string().describe("The new package version"),
		},
		async ({ functionName, name, version }) => {
			try {
				const result = await handleUpdatePackage(
					apiToken,
					{ functionName, name, version },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
			name: z.string().describe("The npm package name to remove"),
		},
		async ({ functionName, name }) => {
			try {
				const result = await handleRemovePackage(
					apiToken,
					{ functionName, name },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
		},
		async ({ functionName }) => {
			try {
				const result = await handleUpdatePackageLayer(
					apiToken,
					{ functionName },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
			newName: z
				.string()
				.describe("The new name for the function (just the name, not username/)"),
		},
		async ({ functionName, newName }) => {
			try {
				const result = await handleRenameFunction(
					apiToken,
					{ functionName, newName },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
		"Retrieves all secrets for the specified function",
		{
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
		},
		async ({ functionName }) => {
			try {
				const result = await handleGetSecrets(
					apiToken,
					{ functionName },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
		"Creates a new secret for the specified function. Secrets cannot be overwritten - delete first if key exists.",
		{
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
			key: z.string().describe("The secret key name"),
			value: z.string().describe("The secret value"),
		},
		async ({ functionName, key, value }) => {
			try {
				const result = await handleCreateSecret(
					apiToken,
					{ functionName, key, value },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
		"Deletes a secret from the specified function",
		{
			functionName: z
				.string()
				.describe(
					"The function identifier in format 'username/functionName' (e.g., 'david/func1')",
				),
			secretId: z.string().describe("The ID of the secret to delete"),
		},
		async ({ functionName, secretId }) => {
			try {
				const result = await handleDeleteSecret(
					apiToken,
					{ functionName, secretId },
					env,
					{} as ExecutionContext,
				);
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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
				return {
					content: [{ type: "text", text: JSON.stringify(result) }],
				};
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

	// Helper to idempotently register dynamic function tools
	const safe = (s: string) =>
		s
			.toLowerCase()
			.replace(/[^a-z0-9._-]/g, "_")
			.slice(0, 48);

	const registerFnTools = async (workspaces: Workspace[]): Promise<number> => {
		let registered = 0;
		for (const ws of workspaces) {
			if (!ws.mcpToolEnabled) continue;
			const toolName = `fn_${safe(ws.name)}`;
			if (registeredDynamicTools.has(toolName)) continue;

			const functionIdentifier = ws.Account?.username
				? `${ws.Account.username}/${ws.name}`
				: ws.name;

			server.tool(
				toolName,
				`Execute the ${ws.name} microfn function`,
				{
					input: z.string().describe("The input to pass to the microfn function"),
				},
				async () => {
					try {
						const result = await handleExecuteFunction(
							apiToken,
							{
								functionName: functionIdentifier,
								inputData: {},
							},
							env,
							{} as ExecutionContext,
						);
						return {
							content: [{ type: "text", text: JSON.stringify(result) }],
						};
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
			);

			registeredDynamicTools.add(toolName);
			registered++;
			console.log(`[mcpServerFactory] ✓ Registered dynamic MCP tool: ${toolName}`);
		}
		if (registered > 0) {
			try {
				// Safe to call; SDK already emits on register/update
				await (server as any).server?.sendToolListChanged?.();
			} catch (e) {
				// Non-fatal; just log
				console.log("[mcpServerFactory] sendToolListChanged failed or unavailable");
			}
		}
		return registered;
	};

	// Dynamic tool registration – register from cache if non-empty, then reconcile with latest
	const registerDynamicTools = async () => {
		try {
			console.log("[mcpServerFactory] Starting dynamic tool registration");

			// 1) Register from non-empty cache for immediate availability
			if (userCacheDO) {
				const cached = await userCacheDO.getFunctions();
				if (Array.isArray(cached) && cached.length > 0) {
					console.log("[mcpServerFactory] Using cached functions:", cached.length);
					updateToolDescriptions(cached, toolRefs);
					await registerFnTools(cached);
				}
			}

			// 2) Always fetch latest, update cache, update descriptions, and register any new tools
			const client = new MicroFnApiClient(apiToken, env.API_BASE_URL);
			const latest = await client.listWorkspaces();
			if (userCacheDO) {
				await userCacheDO.setFunctions(latest);
			}
			updateToolDescriptions(latest, toolRefs);
			const newlyRegistered = await registerFnTools(latest);
			console.log(
				`[mcpServerFactory] Dynamic registration complete. Latest functions: ${latest.length}, newly registered: ${newlyRegistered}`,
			);
		} catch (error) {
			console.error("[mcpServerFactory] Failed to register dynamic tools:", error);
			// Don't throw - we don't want to break server creation if this fails
		}
	};

	// Perform registration synchronously to avoid races with tools/list
	await registerDynamicTools();

	return server;
}
