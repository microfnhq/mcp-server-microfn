// my-mcp-server/src/tools/removePackage.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface RemovePackageRequest {
	username: string;
	functionName: string;
	name: string;
}

export interface RemovePackageResponse {
	success: boolean;
	message?: string;
	error?: string;
}

/**
 * Removes an npm package from a function.
 * @param token - API token for authentication
 * @param req - Object containing username, functionName, and package name
 * @returns Success response or error
 */
export async function handleRemovePackage(
	token: string,
	req: RemovePackageRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<RemovePackageResponse> {
	try {
		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		await client.removePackage(req.username, req.functionName, req.name);
		return {
			success: true,
			message: `Successfully removed package ${req.name}`,
		};
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to remove package",
		};
	}
}
