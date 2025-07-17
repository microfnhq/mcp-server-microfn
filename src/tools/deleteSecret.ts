// my-mcp-server/src/tools/deleteSecret.ts

import { MicroFnApiClient } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface DeleteSecretRequest {
	functionName: string; // format: "username/functionName"
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
 * @param req - Object containing functionName (format: "username/functionName") and secretId
 * @returns Success response or error
 */
export async function handleDeleteSecret(
	token: string,
	req: DeleteSecretRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<DeleteSecretResponse> {
	try {
		const { username, functionName: funcName } = parseFunctionName(req.functionName);
		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		await client.deleteSecret(username, funcName, req.secretId);
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
