// my-mcp-server/src/tools/executeFunction.ts

import { MicroFnApiClient } from "../microfnApiClient";

export interface ExecuteFunctionRequest {
	functionId: string;
	inputData: any;
}

export interface ExecuteFunctionResponse {
	success: boolean;
	result?: any;
	error?: string;
}

/**
 * Executes a MicroFn function by ID with the provided input data.
 * @param params - { functionId, inputData }
 * @returns { success, result?, error? }
 */
export async function handleExecuteFunction(
	token: string,
	params: ExecuteFunctionRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<ExecuteFunctionResponse> {
	const client = new MicroFnApiClient(token);
	try {
		const result = await client.executeFunction(params.functionId, params.inputData);
		return { success: true, result };
	} catch (err: any) {
		return {
			success: false,
			error: err?.message || "Unknown error occurred during function execution",
		};
	}
}
