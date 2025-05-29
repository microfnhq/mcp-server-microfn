// my-mcp-server/src/tools/generateFunction.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface GenerateFunctionRequest {
	prompt: string;
}

export interface GenerateFunctionResponse {
	variations?: Array<{ code: string }>;
	error?: string;
}

/**
 * Generates function code variations using LLM based on a prompt.
 * @param req - Object containing the prompt for function generation.
 * @returns Array of generated function code variations or an error object.
 */
export async function handleGenerateFunction(
	token: string,
	req: GenerateFunctionRequest,
	env: any,
	_ctx: ExecutionContext,
): Promise<GenerateFunctionResponse> {
	const client = new MicroFnApiClient(token, env.API_BASE_URL);
	try {
		const result = await client.generateFunction({ prompt: req.prompt });
		return { variations: result.variations };
	} catch (err: any) {
		return { error: err?.message || "Unknown error occurred" };
	}
}