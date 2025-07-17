// my-mcp-server/src/tools/getFunctionCode.ts

import { MicroFnApiClient } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface GetFunctionCodeRequest {
	functionName: string; // format: "username/functionName"
}

export interface GetFunctionCodeResponse {
	code?: string;
	error?: string;
}

/**
 * Retrieves the source code for a given function using MicroFnApiClient.
 * @param req - Object containing functionName (format: "username/functionName").
 * @returns The function's source code or an error object.
 */
export async function handleGetFunctionCode(
	token: string,
	req: GetFunctionCodeRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<GetFunctionCodeResponse> {
	const { username, functionName: funcName } = parseFunctionName(req.functionName);
	const client = new MicroFnApiClient(token, env.API_BASE_URL);
	try {
		const result = await client.getFunctionCode(username, funcName);
		return { code: result.code };
	} catch (err: any) {
		return { error: err?.message || "Unknown error occurred" };
	}
}
