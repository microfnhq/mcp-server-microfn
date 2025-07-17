// my-mcp-server/src/tools/getSecrets.ts

import { MicroFnApiClient } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface GetSecretsRequest {
	functionName: string; // format: "username/functionName"
}

export interface GetSecretsResponse {
	success: boolean;
	secrets?: Array<{ id: string; key: string; value?: string }>;
	error?: string;
}

/**
 * Retrieves all secrets for the specified function (workspace).
 * @param token - API token for authentication
 * @param req - Object containing functionName (format: "username/functionName")
 * @returns List of secrets or error
 */
export async function handleGetSecrets(
	token: string,
	req: GetSecretsRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<GetSecretsResponse> {
	try {
		const { username, functionName: funcName } = parseFunctionName(req.functionName);
		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		const secrets = await client.listSecrets(username, funcName);
		return { success: true, secrets };
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to get secrets",
		};
	}
}
