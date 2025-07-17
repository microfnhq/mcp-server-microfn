// my-mcp-server/src/tools/updateFunctionCode.ts

import { MicroFnApiClient } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface UpdateFunctionCodeRequest {
	functionName: string; // format: "username/functionName"
	code: string;
}

export interface UpdateFunctionCodeResponse {
	success: boolean;
	data?: any;
	error?: string;
}

/**
 * Updates the code for a given function/workspace using MicroFnApiClient.
 * @param params - { functionName (format: "username/functionName"), code }
 * @returns UpdateFunctionCodeResponse
 */
export async function handleUpdateFunctionCode(
	token: string,
	params: UpdateFunctionCodeRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<UpdateFunctionCodeResponse> {
	const { username, functionName: funcName } = parseFunctionName(params.functionName);
	const client = new MicroFnApiClient(token, env.API_BASE_URL);
	try {
		const data = await client.updateFunctionCode(username, funcName, params.code);
		return {
			success: true,
			data,
		};
	} catch (err: any) {
		return {
			success: false,
			error: err?.message || "Unknown error",
		};
	}
}
