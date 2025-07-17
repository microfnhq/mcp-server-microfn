// my-mcp-server/src/tools/deleteSecret.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface DeleteSecretRequest {
	username: string;
	functionName: string;
	secretId: string;
}

export interface DeleteSecretResponse {
	success: boolean;
	message?: string;
	error?: string;
}

/**
 * Deletes a secret from the specified function (workspace).
 * @param token - API token for authentication
 * @param req - Object containing username, functionName, and secretId
 * @returns Success response or error
 */
export async function handleDeleteSecret(
	token: string,
	req: DeleteSecretRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<DeleteSecretResponse> {
	try {
		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		await client.deleteSecret(req.username, req.functionName, req.secretId);
		return {
			success: true,
			message: "Secret deleted successfully",
		};
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to delete secret",
		};
	}
}
