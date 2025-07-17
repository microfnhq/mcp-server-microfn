// my-mcp-server/src/tools/listPackages.ts

import { MicroFnApiClient } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface ListPackagesRequest {
	functionName: string; // format: "username/functionName"
}

export interface ListPackagesResponse {
	success: boolean;
	packages?: Array<{ name: string; version: string }>;
	error?: string;
}

/**
 * Lists all npm packages installed for a function.
 * @param token - API token for authentication
 * @param req - Object containing the functionName in format "username/functionName"
 * @returns List of packages or error
 */
export async function handleListPackages(
	token: string,
	req: ListPackagesRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<ListPackagesResponse> {
	try {
		const { username, functionName: funcName } = parseFunctionName(req.functionName);

		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		const packages = await client.listPackages(username, funcName);
		return { success: true, packages };
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to list packages",
		};
	}
}
