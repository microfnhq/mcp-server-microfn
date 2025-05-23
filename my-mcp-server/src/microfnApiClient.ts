// my-mcp-server/src/microfnApiClient.ts

export interface Workspace {
	id: string;
	name: string;
	// Add other relevant fields as needed
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
		this.runBaseUrl = "https://microfn.dev";
		this.baseUrl = baseUrl || `${this.runBaseUrl}/api`;
	}

	private getHeaders(): HeadersInit {
		return {
			Authorization: `Bearer ${this.apiToken}`,
			"Content-Type": "application/json",
			Accept: "application/json",
		};
	}

	// --- Package Management ---

	async listPackages(functionId: string): Promise<Array<{ name: string; version: string }>> {
		const res = await fetch(`${this.baseUrl}/workspaces/${functionId}/packages`, {
			method: "GET",
			headers: this.getHeaders(),
		});
		if (!res.ok) throw new Error(`Failed to list packages: ${res.statusText}`);
		const data = (await res.json()) as { packages?: Array<{ name: string; version: string }> };
		return data.packages || [];
	}

	async installPackage(
		functionId: string,
		packageName: string,
		version?: string,
	): Promise<{ name: string; version: string }> {
		const body = { name: packageName, version };
		const res = await fetch(`${this.baseUrl}/workspaces/${functionId}/packages`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify(body),
		});
		if (!res.ok) throw new Error(`Failed to install package: ${res.statusText}`);
		const data = (await res.json()) as { package?: { name: string; version: string } };
		return data.package || { name: packageName, version: version || "" };
	}

	async updatePackage(
		functionId: string,
		packageName: string,
		version?: string,
	): Promise<{ name: string; version: string }> {
		const body = { version };
		const res = await fetch(
			`${this.baseUrl}/workspaces/${functionId}/packages/${encodeURIComponent(packageName)}`,
			{
				method: "PUT",
				headers: this.getHeaders(),
				body: JSON.stringify(body),
			},
		);
		if (!res.ok) throw new Error(`Failed to update package: ${res.statusText}`);
		const data = (await res.json()) as { package?: { name: string; version: string } };
		return data.package || { name: packageName, version: version || "" };
	}

	async removePackage(functionId: string, packageName: string): Promise<void> {
		const res = await fetch(
			`${this.baseUrl}/workspaces/${functionId}/packages/${encodeURIComponent(packageName)}`,
			{
				method: "DELETE",
				headers: this.getHeaders(),
			},
		);
		if (!res.ok) throw new Error(`Failed to remove package: ${res.statusText}`);
	}

	async updatePackageLayer(functionId: string): Promise<{ message?: string }> {
		const res = await fetch(`${this.baseUrl}/workspaces/${functionId}/packages/update-layer`, {
			method: "POST",
			headers: this.getHeaders(),
		});
		if (!res.ok) throw new Error(`Failed to update package layer: ${res.statusText}`);
		const data = (await res.json()) as { message?: string };
		return data;
	}

	// Workspace (Function) Management

	async createWorkspace(params: CreateWorkspaceParams): Promise<Workspace> {
		const res = await fetch(`${this.baseUrl}/workspaces`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ name: params.name, initialCode: params.code }),
		});
		if (!res.ok) throw new Error(`Failed to create workspace: ${res.statusText}`);
		const data = (await res.json()) as { workspace?: Workspace };
		return data.workspace || ({} as Workspace);
	}

	async updateWorkspace(workspaceId: string, params: UpdateWorkspaceParams): Promise<Workspace> {
		const res = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/code`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ code: params.code }),
		});
		if (!res.ok) throw new Error(`Failed to update workspace: ${res.statusText}`);
		return await res.json();
	}

	async renameWorkspace(workspaceId: string, newName: string): Promise<Workspace> {
		const res = await fetch(`${this.baseUrl}/workspaces/${workspaceId}`, {
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
		const res = await fetch(`${this.baseUrl}/workspaces`, {
			method: "GET",
			headers: this.getHeaders(),
		});
		if (!res.ok) throw new Error(`Failed to list workspaces: ${res.statusText}`);
		const data = (await res.json()) as { workspaces?: Workspace[] };
		return data.workspaces || [];
	}

	// Function Code

	async getFunctionCode(functionId: string): Promise<FunctionCode> {
		const res = await fetch(`${this.baseUrl}/workspaces/${functionId}/code`, {
			method: "GET",
			headers: this.getHeaders(),
		});
		if (!res.ok) throw new Error(`Failed to get function code: ${res.statusText}`);
		const data = (await res.json()) as { code?: string };
		return { code: data.code || "" };
	}

	async updateFunctionCode(functionId: string, code: string): Promise<Workspace> {
		const res = await fetch(`${this.baseUrl}/workspaces/${functionId}/code`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ code }),
		});
		if (!res.ok) throw new Error(`Failed to update function code: ${res.statusText}`);
		return await res.json();
	}

	// Function Execution

	async executeFunction(functionId: string, inputData: any): Promise<ExecuteFunctionResult> {
		const res = await fetch(`${this.runBaseUrl}/run/${functionId}`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify(inputData),
		});
		if (!res.ok) throw new Error(`Failed to execute function: ${res.statusText}`);

		try {
			const result = await res.json();
			return { result };
		} catch (error) {
			// If JSON parsing fails, return the text response
			const textResult = await res.text();
			return { result: textResult };
		}
	}

	// Deployments

	async getLatestDeployment(functionId: string): Promise<Deployment> {
		const res = await fetch(`${this.baseUrl}/workspaces/${functionId}/deployments/latest`, {
			method: "GET",
			headers: this.getHeaders(),
		});
		if (!res.ok) throw new Error(`Failed to get latest deployment: ${res.statusText}`);
		const data = (await res.json()) as { deployment?: Deployment };
		return data.deployment || ({} as Deployment);
	}

	// Secrets Management

	async listSecrets(workspaceId: string): Promise<Secret[]> {
		const res = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/secrets`, {
			method: "GET",
			headers: this.getHeaders(),
		});
		if (!res.ok) throw new Error(`Failed to list secrets: ${res.statusText}`);
		const data = (await res.json()) as { secrets?: Secret[] };
		return data.secrets || [];
	}

	async createSecret(workspaceId: string, params: CreateSecretParams): Promise<Secret[]> {
		const res = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/secrets`, {
			method: "POST",
			headers: this.getHeaders(),
			body: JSON.stringify({ key: params.key, value: params.value }),
		});
		if (!res.ok) throw new Error(`Failed to create secret: ${res.statusText}`);
		const data = (await res.json()) as { secrets?: Secret[] };
		return data.secrets || [];
	}

	async updateSecret(
		workspaceId: string,
		secretId: string,
		params: UpdateSecretParams,
	): Promise<Secret> {
		// Note: The Python API doesn't have an update method, only create/delete
		// This would need to be implemented if the API supports it
		throw new Error("Update secret not implemented - use create/delete instead");
	}

	async deleteSecret(workspaceId: string, secretId: string): Promise<void> {
		const res = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/secrets/${secretId}`, {
			method: "DELETE",
			headers: this.getHeaders(),
		});
		if (!res.ok) throw new Error(`Failed to delete secret: ${res.statusText}`);
	}
}
