// my-mcp-server/src/tools/executeFunction.ts

import { MicroFnApiClient } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface ExecuteFunctionRequest {
	functionName: string; // format: "username/functionName"
	inputData: any;
}

export interface ExecuteFunctionResponse {
	success: boolean;
	result?: any;
	error?: string;
}

/**
 * Executes a MicroFn function with the provided input data.
 * @param params - { functionName (format: "username/functionName"), inputData }
 * @returns { success, result?, error? }
 */
export async function handleExecuteFunction(
	token: string,
	params: ExecuteFunctionRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<ExecuteFunctionResponse> {
	const { username, functionName: funcName } = parseFunctionName(params.functionName);
	const client = new MicroFnApiClient(token, env.API_BASE_URL);

	// Set timeout for function execution (configurable, default 20 seconds)
	const timeoutMs = env?.FUNCTION_EXECUTION_TIMEOUT_MS || 20000;

	const timeoutPromise = new Promise<ExecuteFunctionResponse>((_, reject) => {
		setTimeout(() => {
			reject(
				new Error(
					`Function execution timeout after ${timeoutMs}ms - this may cause MCP connection to close. Try reducing function complexity or input size.`,
				),
			);
		}, timeoutMs);
	});

	const executionPromise = async (): Promise<ExecuteFunctionResponse> => {
		try {
			const result = await client.executeFunction(username, funcName, params.inputData);
			return { success: true, result };
		} catch (err: any) {
			return {
				success: false,
				error: err?.message || "Unknown error occurred during function execution",
			};
		}
	};

	try {
		return await Promise.race([executionPromise(), timeoutPromise]);
	} catch (err: any) {
		// Handle timeout specifically
		if (err.message.includes("timeout")) {
			return {
				success: false,
				error: err.message,
			};
		}
		return {
			success: false,
			error: err?.message || "Unknown error occurred during function execution",
		};
	}
}
