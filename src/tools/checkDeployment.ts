// my-mcp-server/src/tools/checkDeployment.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface CheckDeploymentRequest {
	username: string;
	functionName: string;
}

export interface DeploymentDetails {
	id: string;
	status: string;
	createdAt: string;
	updatedAt: string;
	[key: string]: unknown;
}

export interface CheckDeploymentResponse {
	deployment: DeploymentDetails | null;
	error?: string;
}

/**
 * Fetches deployment details for a given function using MicroFnApiClient.
 * @param req - The request object containing username and functionName.
 * @param env - The environment object (should contain MICROFN_API_TOKEN).
 * @returns Deployment details or error.
 */
export async function handleCheckDeployment(
	token: string,
	req: CheckDeploymentRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<CheckDeploymentResponse> {
	if (!req.username || !req.functionName) {
		return { deployment: null, error: "username and functionName are required" };
	}

	const client = new MicroFnApiClient(token, env.API_BASE_URL);

	try {
		const deployment = await client.getLatestDeployment(req.username, req.functionName);
		if (!deployment || !deployment.id) {
			return { deployment: null, error: "Deployment not found" };
		}
		return { deployment };
	} catch (err: any) {
		return {
			deployment: null,
			error: err?.message || "Failed to fetch deployment details",
		};
	}
}
