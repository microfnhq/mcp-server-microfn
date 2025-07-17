// my-mcp-server/src/tools/getFunctionCode.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface GetFunctionCodeRequest {
	username: string;
	functionName: string;
}

export interface GetFunctionCodeResponse {
	code?: string;
	error?: string;
}

/**
 * Retrieves the source code for a given function using MicroFnApiClient.
 * @param req - Object containing username and functionName.
 * @returns The function's source code or an error object.
 */
export async function handleGetFunctionCode(
	token: string,
	req: GetFunctionCodeRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<GetFunctionCodeResponse> {
	const client = new MicroFnApiClient(token, env.API_BASE_URL);
	try {
		const result = await client.getFunctionCode(req.username, req.functionName);
		return { code: result.code };
	} catch (err: any) {
		return { error: err?.message || "Unknown error occurred" };
	}
}
