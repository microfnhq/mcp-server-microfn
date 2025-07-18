// my-mcp-server/src/tools/createSecret.ts

import { MicroFnApiClient } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface CreateSecretRequest {
	functionName: string; // format: "username/functionName"
	key: string;
	value: string;
}

export interface CreateSecretResponse {
	success: boolean;
	secrets?: Array<{ id: string; key: string; value?: string }>;
	error?: string;
}

/**
 * Creates a new secret for the specified function (workspace).
 *
 * Note: Secrets cannot be overwritten. If a secret with the same key already exists,
 * you must delete it first before creating a new one with the same key.
 *
 * Example (retrieving secrets in your function code):
 * ```js
 * import secret from "@microfn/secret";
 * const url = await secret.getRequired("DISCORD_WEBHOOK_URL");
 * ```
 *
 * @param token - API token for authentication
 * @param req - Object containing functionName (format: "username/functionName"), key, and value
 * @returns List of secrets after creation or error
 */
export async function handleCreateSecret(
	token: string,
	req: CreateSecretRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<CreateSecretResponse> {
	try {
		const { username, functionName: funcName } = parseFunctionName(req.functionName);
		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		const secrets = await client.createSecret(username, funcName, {
			key: req.key,
			value: req.value,
		});
		return { success: true, secrets };
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to create secret",
		};
	}
}
