// my-mcp-server/src/tools/renameFunction.ts

import { MicroFnApiClient, Workspace } from "../microfnApiClient.js";

export interface RenameFunctionRequest {
	functionId: string;
	newName: string;
}

export interface RenameFunctionResponse {
	success: boolean;
	workspace?: Workspace;
	error?: string;
}

/**
 * Renames a function/workspace using the MicroFnApiClient.
 * @param req RenameFunctionRequest
 * @returns RenameFunctionResponse
 */
export async function handleRenameFunction(
	token: string,
	req: RenameFunctionRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<RenameFunctionResponse> {
	const client = new MicroFnApiClient(token, env.API_BASE_URL);
	try {
		const workspace = await client.renameWorkspace(req.functionId, req.newName);
		return {
			success: true,
			workspace,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error?.message || "Unknown error",
		};
	}
}
