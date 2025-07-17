// my-mcp-server/src/tools/updatePackageLayer.ts

import { MicroFnApiClient } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface UpdatePackageLayerRequest {
	functionName: string; // format: "username/functionName"
}

export interface UpdatePackageLayerResponse {
	success: boolean;
	message?: string;
	error?: string;
}

/**
 * Updates the Lambda layer with the function's packages.
 * @param token - API token for authentication
 * @param req - Object containing functionName (format: "username/functionName")
 * @returns Success response or error
 */
export async function handleUpdatePackageLayer(
	token: string,
	req: UpdatePackageLayerRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<UpdatePackageLayerResponse> {
	try {
		const { username, functionName: funcName } = parseFunctionName(req.functionName);
		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		const result = await client.updatePackageLayer(username, funcName);
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
