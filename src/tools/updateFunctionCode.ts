// my-mcp-server/src/tools/updateFunctionCode.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface UpdateFunctionCodeRequest {
	functionId: string;
	code: string;
}

export interface UpdateFunctionCodeResponse {
	success: boolean;
	data?: any;
	error?: string;
}

/**
 * Updates the code for a given function/workspace using MicroFnApiClient.
 * @param params - { functionId, code }
 * @returns UpdateFunctionCodeResponse
 */
export async function handleUpdateFunctionCode(
	token: string,
	params: UpdateFunctionCodeRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<UpdateFunctionCodeResponse> {
	const client = new MicroFnApiClient(token);
	try {
		const data = await client.updateFunctionCode(params.functionId, params.code);
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
