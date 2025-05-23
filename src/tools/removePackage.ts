// my-mcp-server/src/tools/removePackage.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface RemovePackageRequest {
	functionId: string;
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
 * @param req - Object containing functionId and package name
 * @returns Success response or error
 */
export async function handleRemovePackage(
	token: string,
	req: RemovePackageRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<RemovePackageResponse> {
	try {
		const client = new MicroFnApiClient(token);
		await client.removePackage(req.functionId, req.name);
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
