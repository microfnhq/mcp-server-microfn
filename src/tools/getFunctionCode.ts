// my-mcp-server/src/tools/getFunctionCode.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface GetFunctionCodeRequest {
	functionId: string;
}

export interface GetFunctionCodeResponse {
	code?: string;
	error?: string;
}

/**
 * Retrieves the source code for a given functionId using MicroFnApiClient.
 * @param req - Object containing the functionId.
 * @returns The function's source code or an error object.
 */
export async function handleGetFunctionCode(
	token: string,
	req: GetFunctionCodeRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<GetFunctionCodeResponse> {
	const client = new MicroFnApiClient(token);
	try {
		const result = await client.getFunctionCode(req.functionId);
		return { code: result.code };
	} catch (err: any) {
		return { error: err?.message || "Unknown error occurred" };
	}
}
