// my-mcp-server/src/tools/rewriteFunction.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface RewriteFunctionRequest {
	code: string;
}

export interface RewriteFunctionResponse {
	code?: string;
	error?: string;
}

/**
 * Rewrites existing JavaScript code to fit the MicroFn platform using LLM.
 * @param req - Object containing the JavaScript code to rewrite.
 * @returns The rewritten code for MicroFn or an error object.
 */
export async function handleRewriteFunction(
	token: string,
	req: RewriteFunctionRequest,
	env: any,
	_ctx: ExecutionContext,
): Promise<RewriteFunctionResponse> {
	const client = new MicroFnApiClient(token, env.API_BASE_URL);
	try {
		const result = await client.rewriteFunction({ code: req.code });
		return { code: result.code };
	} catch (err: any) {
		return { error: err?.message || "Unknown error occurred" };
	}
}
