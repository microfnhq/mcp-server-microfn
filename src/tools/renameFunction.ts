// my-mcp-server/src/tools/renameFunction.ts

import { MicroFnApiClient, type Workspace } from "../microfnApiClient.js";

export interface RenameFunctionRequest {
	username: string;
	functionName: string;
	newName: string;
}

export interface RenameFunctionResponse {
	success: boolean;
	workspace?: Workspace;
	error?: string;
}

/**
 * Renames a function/workspace using the MicroFnApiClient.
 * @param req RenameFunctionRequest containing username, functionName, and newName
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
		const workspace = await client.renameWorkspace(req.username, req.functionName, req.newName);
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
