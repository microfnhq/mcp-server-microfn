// my-mcp-server/src/tools/createFunction.ts

import { MicroFnApiClient, Workspace } from "../microfnApiClient.js";

export interface CreateFunctionRequest {
	name: string;
	code: string;
}

export interface CreateFunctionResponse {
	success: boolean;
	workspace?: Workspace;
	error?: string;
}

/**
 * Creates a new function/workspace using MicroFnApiClient.
 * @param params - The parameters for function creation.
 * @returns Information about the created workspace or an error.
 */
export async function handleCreateFunction(
	token: string,
	params: CreateFunctionRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<CreateFunctionResponse> {
	const client = new MicroFnApiClient(token, env.API_BASE_URL);
	try {
		const workspace = await client.createWorkspace({
			name: params.name,
			code: params.code,
		});
		return {
			success: true,
			workspace,
		};
	} catch (err: any) {
		return {
			success: false,
			error: err?.message || "Unknown error occurred",
		};
	}
}
