// my-mcp-server/src/tools/getSecrets.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface GetSecretsRequest {
	username: string;
	functionName: string;
}

export interface GetSecretsResponse {
	success: boolean;
	secrets?: Array<{ id: string; key: string; value?: string }>;
	error?: string;
}

/**
 * Retrieves all secrets for the specified function (workspace).
 * @param token - API token for authentication
 * @param req - Object containing username and functionName
 * @returns List of secrets or error
 */
export async function handleGetSecrets(
	token: string,
	req: GetSecretsRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<GetSecretsResponse> {
	try {
		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		const secrets = await client.listSecrets(req.username, req.functionName);
		return { success: true, secrets };
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to get secrets",
		};
	}
}
