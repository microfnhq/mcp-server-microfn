// my-mcp-server/src/tools/updatePackageLayer.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface UpdatePackageLayerRequest {
	functionId: string;
}

export interface UpdatePackageLayerResponse {
	success: boolean;
	message?: string;
	error?: string;
}

/**
 * Updates the Lambda layer with the function's packages.
 * @param token - API token for authentication
 * @param req - Object containing functionId
 * @returns Success response or error
 */
export async function handleUpdatePackageLayer(
	token: string,
	req: UpdatePackageLayerRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<UpdatePackageLayerResponse> {
	try {
		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		const result = await client.updatePackageLayer(req.functionId);
		return {
			success: true,
			message: result.message || "Successfully updated package layer",
		};
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to update package layer",
		};
	}
}
