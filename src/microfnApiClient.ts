// my-mcp-server/src/microfnApiClient.ts

import { decodeJwt } from "jose";

export interface Workspace {
	id: string;
	name: string;
	username?: string;
	mcpToolEnabled: boolean;
	isPublic: boolean;
	hasPublicEndpoint: boolean;
	cron?: string;
	publishedAt?: string | null;
	createdAt: string;
	updatedAt: string;
	Account?: {
		id: string;
		name: string;
		username: string;
	};
}

export interface Secret {
	id: string;
	key: string;
	value?: string;
}

export interface Deployment {
	id: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	[key: string]: unknown;
	// Add other relevant fields as needed
}

export interface FunctionCode {
	code: string;
}

export interface ExecuteFunctionResult {
	result: any;
}

export interface GenerateFunctionParams {
	prompt: string;
}

export interface GenerateFunctionResult {
	variations: Array<{ code: string }>;
}

export interface RewriteFunctionParams {
	code: string;
}

export interface RewriteFunctionResult {
	code: string;
}

export interface CreateWorkspaceParams {
	name: string;
	code: string;
}

export interface UpdateWorkspaceParams {
	code: string;
}

export interface CreateSecretParams {
	key: string;
	value: string;
}

export interface UpdateSecretParams {
	value: string;
}

export class MicroFnApiClient {
	private apiToken: string;
	private baseUrl: string;
	private runBaseUrl: string;

	constructor(apiToken: string, baseUrl?: string) {
		this.apiToken = apiToken;
		this.runBaseUrl = baseUrl?.replace("/api", "") || "https://microfn.dev";
		this.baseUrl = baseUrl || `${this.runBaseUrl}/api`;
		console.log("[MicroFnApiClient] Initialized:", {
			baseUrl: this.baseUrl,
			runBaseUrl: this.runBaseUrl,
			hasToken: !!apiToken,
			tokenType: apiToken.startsWith("mfn_") ? "PAT" : "Auth0 ID Token",
		});
	}

	private validateToken(): void {
		// Skip validation for PAT tokens
		if (this.apiToken.startsWith("mfn_") || this.apiToken.startsWith("mfp_")) {
			return;
		}

		// Validate Auth0 ID token
		try {
			const tokenPayload = decodeJwt(this.apiToken);
			const currentTime = Math.floor(Date.now() / 1000);
			const tokenExp = tokenPayload.exp as number;

			if (currentTime >= tokenExp) {
				const expiredAt = new Date(tokenExp * 1000).toISOString();
				console.error("[MicroFnApiClient] Auth0 ID token expired at:", expiredAt);
				throw new Error(`Auth0 ID token expired at ${expiredAt}. Please re-authenticate.`);
			}
		} catch (error) {
			if (error instanceof Error && error.message.includes("expired")) {
				throw error;
			}
			console.error("[MicroFnApiClient] Failed to validate token:", error);
			throw new Error("Invalid Auth0 ID token");
		}
	}

	private getHeaders(): HeadersInit {
		const headers = {
			Authorization: `Bearer ${this.apiToken}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		};
		console.log("[MicroFnApiClient] Request headers:", {
			hasAuth: !!headers.Authorization,
			tokenPrefix: this.apiToken ? this.apiToken.substring(0, 10) + "..." : "none",
		});
		return headers;
	}

	// --- Package Management ---

	async listPackages(
		username: string,
		functionName: string,
	): Promise<Array<{ name: string; version: string }>> {
		const url = `${this.baseUrl}/workspaces/${username}/${functionName}/packages`;
		console.log("[MicroFnApiClient] GET", url);

		const res = await fetch(url, {
			method: "GET",
			headers: this.getHeaders(),
		});

		console.log("[MicroFnApiClient] Response:", res.status, res.statusText);
		if (!res.ok) throw new Error(`Failed to list packages: ${res.statusText}`);

		const data = (await res.json()) as {
			packages?: Array<{ name: string; version: string }>;
		};
		return data.packages || [];
	}

	async installPackage(
		username: string,
		functionName: string,
		packageName: string,
		version?: string,
	): Promise<{ name: string; version: string }> {
		const body = { name: packageName, version };
		const res = await fetch(`${this.baseUrl}/workspaces/${username}/${functionName}/packages`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify(body),
		});
		if (!res.ok) throw new Error(`Failed to install package: ${res.statusText}`);
		const data = (await res.json()) as {
			package?: { name: string; version: string };
		};
		return data.package || { name: packageName, version: version || "" };
	}

	async updatePackage(
		username: string,
		functionName: string,
		packageName: string,
		version?: string,
	): Promise<{ name: string; version: string }> {
		const body = { version };
		const res = await fetch(
			`${this.baseUrl}/workspaces/${username}/${functionName}/packages/${encodeURIComponent(packageName)}`,
			{
				method: "PUT",
				headers: this.getHeaders(),
				body: JSON.stringify(body),
			},
		);
		if (!res.ok) throw new Error(`Failed to update package: ${res.statusText}`);
		const data = (await res.json()) as {
			package?: { name: string; version: string };
		};
		return data.package || { name: packageName, version: version || "" };
	}

	async removePackage(
		username: string,
		functionName: string,
		packageName: string,
	): Promise<void> {
		const res = await fetch(
			`${this.baseUrl}/workspaces/${username}/${functionName}/packages/${encodeURIComponent(packageName)}`,
			{
				method: "DELETE",
				headers: this.getHeaders(),
			},
		);
		if (!res.ok) throw new Error(`Failed to remove package: ${res.statusText}`);
	}

	async updatePackageLayer(
		username: string,
		functionName: string,
	): Promise<{ message?: string }> {
		const res = await fetch(
			`${this.baseUrl}/workspaces/${username}/${functionName}/packages/update-layer`,
			{
				method: "POST",
				headers: this.getHeaders(),
			},
		);
		if (!res.ok) throw new Error(`Failed to update package layer: ${res.statusText}`);
		const data = (await res.json()) as { message?: string };
		return data;
	}

	// Workspace (Function) Management

	async createWorkspace(params: CreateWorkspaceParams): Promise<Workspace> {
		const res = await fetch(`${this.baseUrl}/workspaces`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({
				name: params.name,
				initialCode: params.code,
			}),
		});
		if (!res.ok) throw new Error(`Failed to create workspace: ${res.statusText}`);
		const data = (await res.json()) as { workspace?: Workspace };
		return data.workspace || ({} as Workspace);
	}

	async updateWorkspace(
		username: string,
		functionName: string,
		params: UpdateWorkspaceParams,
	): Promise<Workspace> {
		const res = await fetch(`${this.baseUrl}/workspaces/${username}/${functionName}/code`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ code: params.code }),
		});
		if (!res.ok) throw new Error(`Failed to update workspace: ${res.statusText}`);
		return await res.json();
	}

	async renameWorkspace(
		username: string,
		functionName: string,
		newName: string,
	): Promise<Workspace> {
		const res = await fetch(`${this.baseUrl}/workspaces/${username}/${functionName}`, {
			method: "PATCH",
			headers: this.getHeaders(),
			body: JSON.stringify({ name: newName }),
		});
		if (!res.ok) {
			throw new Error(`Failed to rename workspace: ${res.statusText}`);
		}
		const data = (await res.json()) as { workspace?: Workspace };
		return data.workspace || ({} as Workspace);
	}

	async listWorkspaces(): Promise<Workspace[]> {
		// Validate token before making the request
		this.validateToken();

		const url = `${this.baseUrl}/workspaces`;
		console.log("[MicroFnApiClient] GET", url);

		const res = await fetch(url, {
			method: "GET",
			headers: this.getHeaders(),
		});

		console.log("[MicroFnApiClient] Response:", res.status, res.statusText);
		if (!res.ok) {
			const errorText = await res.text();
			console.error("[MicroFnApiClient] Error response:", errorText);
			throw new Error(`Failed to list workspaces: ${res.statusText}`);
		}

		const data = (await res.json()) as { workspaces?: Workspace[] };
		console.log("[MicroFnApiClient] Found", data.workspaces?.length || 0, "workspaces");
		return data.workspaces || [];
	}

	// Function Code

	async getFunctionCode(username: string, functionName: string): Promise<FunctionCode> {
		const url = `${this.baseUrl}/workspaces/${username}/${functionName}/code`;
		console.log("[MicroFnApiClient] GET", url);

		const res = await fetch(url, {
			method: "GET",
			headers: this.getHeaders(),
		});

		console.log("[MicroFnApiClient] Response:", res.status, res.statusText);
		if (!res.ok) {
			const errorText = await res.text();
			console.error("[MicroFnApiClient] Error response:", errorText);
			throw new Error(`Failed to get function code: ${res.statusText}`);
		}

		const data = (await res.json()) as { code?: string };
		console.log("[MicroFnApiClient] Got code, length:", data.code?.length || 0);
		return { code: data.code || "" };
	}

	async updateFunctionCode(
		username: string,
		functionName: string,
		code: string,
	): Promise<Workspace> {
		const res = await fetch(`${this.baseUrl}/workspaces/${username}/${functionName}/code`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ code }),
		});
		if (!res.ok) throw new Error(`Failed to update function code: ${res.statusText}`);
		return await res.json();
	}

	// Function Execution

	async executeFunction(
		username: string,
		functionName: string,
		inputData: any,
	): Promise<ExecuteFunctionResult> {
		const url = `${this.runBaseUrl}/run/${username}/${functionName}?format=json&includeLogs=true`;
		console.log("[MicroFnApiClient] POST", url);
		console.log("[MicroFnApiClient] Input data:", JSON.stringify(inputData));

		const res = await fetch(url, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify(inputData),
		});

		console.log("[MicroFnApiClient] Response:", res.status, res.statusText);
		if (!res.ok) throw new Error(`Failed to execute function: ${res.statusText}`);

		// Read the response body once as text to avoid "Body has already been used" error
		const textResult = await res.text();
		console.log("[MicroFnApiClient] Raw response:", textResult);

		try {
			// Try to parse as JSON first
			const result = JSON.parse(textResult);
			console.log("[MicroFnApiClient] Execution result (JSON):", result);
			return { result };
		} catch (error) {
			// If JSON parsing fails, return the text response
			console.log("[MicroFnApiClient] Execution result (text):", textResult);
			return { result: textResult };
		}
	}

	// Deployments

	async getLatestDeployment(username: string, functionName: string): Promise<Deployment> {
		const res = await fetch(
			`${this.baseUrl}/workspaces/${username}/${functionName}/deployments/latest`,
			{
				method: "GET",
				headers: this.getHeaders(),
			},
		);
		if (!res.ok) throw new Error(`Failed to get latest deployment: ${res.statusText}`);
		const data = (await res.json()) as { deployment?: Deployment };
		return data.deployment || ({} as Deployment);
	}

	// Secrets Management

	async listSecrets(username: string, functionName: string): Promise<Secret[]> {
		const res = await fetch(`${this.baseUrl}/workspaces/${username}/${functionName}/secrets`, {
			method: "GET",
			headers: this.getHeaders(),
		});
		if (!res.ok) throw new Error(`Failed to list secrets: ${res.statusText}`);
		const data = (await res.json()) as { secrets?: Secret[] };
		return data.secrets || [];
	}

	async createSecret(
		username: string,
		functionName: string,
		params: CreateSecretParams,
	): Promise<Secret[]> {
		const res = await fetch(`${this.baseUrl}/workspaces/${username}/${functionName}/secrets`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ key: params.key, value: params.value }),
		});
		if (!res.ok) throw new Error(`Failed to create secret: ${res.statusText}`);
		const data = (await res.json()) as { secrets?: Secret[] };
		return data.secrets || [];
	}

	async updateSecret(
		username: string,
		functionName: string,
		secretId: string,
		params: UpdateSecretParams,
	): Promise<Secret> {
		// Note: The Python API doesn't have an update method, only create/delete
		// This would need to be implemented if the API supports it
		throw new Error("Update secret not implemented - use create/delete instead");
	}

	async deleteSecret(username: string, functionName: string, secretId: string): Promise<void> {
		const res = await fetch(
			`${this.baseUrl}/workspaces/${username}/${functionName}/secrets/${secretId}`,
			{
				method: "DELETE",
				headers: this.getHeaders(),
			},
		);
		if (!res.ok) throw new Error(`Failed to delete secret: ${res.statusText}`);
	}

	// Function Generation

	async generateFunction(params: GenerateFunctionParams): Promise<GenerateFunctionResult> {
		const url = `${this.baseUrl}/generate/function`;
		console.log("[MicroFnApiClient] POST", url);
		console.log("[MicroFnApiClient] Prompt:", params.prompt);

		const res = await fetch(url, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ prompt: params.prompt }),
		});

		console.log("[MicroFnApiClient] Response:", res.status, res.statusText);
		if (!res.ok) {
			const errorText = await res.text();
			console.error("[MicroFnApiClient] Error response:", errorText);
			throw new Error(`Failed to generate function: ${res.statusText}`);
		}

		const data = (await res.json()) as GenerateFunctionResult;
		console.log("[MicroFnApiClient] Generated", data.variations?.length || 0, "variations");
		return data;
	}

	async rewriteFunction(params: RewriteFunctionParams): Promise<RewriteFunctionResult> {
		const url = `${this.baseUrl}/generate/rewrite`;
		console.log("[MicroFnApiClient] POST", url);
		console.log("[MicroFnApiClient] Code length:", params.code.length);

		const res = await fetch(url, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ code: params.code }),
		});

		console.log("[MicroFnApiClient] Response:", res.status, res.statusText);
		if (!res.ok) {
			const errorText = await res.text();
			console.error("[MicroFnApiClient] Error response:", errorText);
			throw new Error(`Failed to rewrite function: ${res.statusText}`);
		}

		const data = (await res.json()) as RewriteFunctionResult;
		console.log("[MicroFnApiClient] Rewritten code length:", data.code?.length || 0);
		return data;
	}
}
