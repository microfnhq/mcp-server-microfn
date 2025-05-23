// my-mcp-server/src/tools/listPackages.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface ListPackagesRequest {
	functionId: string;
}

export interface ListPackagesResponse {
	success: boolean;
	packages?: Array<{ name: string; version: string }>;
	error?: string;
}

/**
 * Lists all npm packages installed for a function.
 * @param token - API token for authentication
 * @param req - Object containing the functionId
 * @returns List of packages or error
 */
export async function handleListPackages(
	token: string,
	req: ListPackagesRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<ListPackagesResponse> {
	try {
		const client = new MicroFnApiClient(token);
		const packages = await client.listPackages(req.functionId);
		return { success: true, packages };
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to list packages",
		};
	}
}
