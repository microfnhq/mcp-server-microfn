// my-mcp-server/src/tools/renameFunction.ts

import { MicroFnApiClient, type Workspace } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface RenameFunctionRequest {
	functionName: string; // format: "username/functionName"
	newName: string;
}

export interface RenameFunctionResponse {
	success: boolean;
	workspace?: Workspace;
	error?: string;
}

/**
 * Renames a function/workspace using the MicroFnApiClient.
 * @param req RenameFunctionRequest containing functionName (format: "username/functionName") and newName
 * @returns RenameFunctionResponse
 */
export async function handleRenameFunction(
	token: string,
	req: RenameFunctionRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<RenameFunctionResponse> {
	const { username, functionName: funcName } = parseFunctionName(req.functionName);
	const client = new MicroFnApiClient(token, env.API_BASE_URL);
	try {
		const workspace = await client.renameWorkspace(username, funcName, req.newName);
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
