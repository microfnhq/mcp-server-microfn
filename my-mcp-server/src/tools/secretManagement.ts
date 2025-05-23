// my-mcp-server/src/tools/secretManagement.ts

import { MicroFnApiClient } from "../microfnApiClient";

// Interfaces for request parameters and responses
export interface ListSecretsParams {
	functionId: string;
}

export interface Secret {
	id: string;
	key: string;
	value?: string; // Value may not be returned for list
}

export interface ListSecretsResponse {
	secrets: Secret[];
}

export interface CreateSecretParams {
	functionId: string;
	secretKey: string;
	secretValue: string;
}

export interface CreateSecretResponse {
	success: boolean;
	secret?: Secret[];
	error?: string;
}

export interface DeleteSecretParams {
	functionId: string;
	secretKey: string;
}

export interface DeleteSecretResponse {
	success: boolean;
	error?: string;
}

// Sub-handler: List all secrets for a function
export async function listSecrets(
	token: string,
	params: ListSecretsParams,
): Promise<ListSecretsResponse | { error: string }> {
	try {
		const client = new MicroFnApiClient(token);
		const secrets = await client.listSecrets(params.functionId);
		return { secrets };
	} catch (error: any) {
		return { error: error.message || "Failed to list secrets" };
	}
}

// Sub-handler: Create a new secret for a function
export async function createSecret(
	token: string,
	params: CreateSecretParams,
): Promise<CreateSecretResponse> {
	try {
		const client = new MicroFnApiClient(token);
		const secrets = await client.createSecret(params.functionId, {
			key: params.secretKey,
			value: params.secretValue,
		});
		return { success: true, secret: secrets };
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to create secret",
		};
	}
}

// Sub-handler: Delete a secret for a function
export async function deleteSecret(
	token: string,
	params: DeleteSecretParams,
): Promise<DeleteSecretResponse> {
	try {
		const client = new MicroFnApiClient(token);
		await client.deleteSecret(params.functionId, params.secretKey);
		return { success: true };
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to delete secret",
		};
	}
}

// Main handler function
export async function handleSecretManagement(
	token: string,
	params: {
		action: "list" | "create" | "delete";
		data: ListSecretsParams | CreateSecretParams | DeleteSecretParams;
	},
	env: any,
	ctx: ExecutionContext,
): Promise<any> {
	switch (params.action) {
		case "list":
			return await listSecrets(token, params.data as ListSecretsParams);
		case "create":
			return await createSecret(token, params.data as CreateSecretParams);
		case "delete":
			return await deleteSecret(token, params.data as DeleteSecretParams);
		default:
			return { error: "Invalid action" };
	}
}
