// my-mcp-server/src/tools/updatePackage.ts

import { MicroFnApiClient } from "../microfnApiClient.js";
import { parseFunctionName } from "./utils.js";

export interface UpdatePackageRequest {
	functionName: string; // format: "username/functionName"
	name: string;
	version?: string;
}

export interface UpdatePackageResponse {
	success: boolean;
	package?: { name: string; version: string };
	error?: string;
}

/**
 * Updates an npm package version for a function.
 * @param token - API token for authentication
 * @param req - Object containing functionName (format: "username/functionName"), name, and optional version
 * @returns Updated package info or error
 */
export async function handleUpdatePackage(
	token: string,
	req: UpdatePackageRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<UpdatePackageResponse> {
	try {
		const { username, functionName: funcName } = parseFunctionName(req.functionName);
		let version = req.version;

		// Fetch latest version from npm if not specified or set to 'latest'
		if (!version || version === "latest") {
			try {
				const npmResponse = await fetch(`https://registry.npmjs.org/${req.name}/latest`);
				if (!npmResponse.ok) {
					throw new Error(`Failed to fetch from npm registry: ${npmResponse.statusText}`);
				}
				const npmData = (await npmResponse.json()) as { version?: string };
				version = npmData.version;
				console.log(`Using latest version ${version} from npm registry`);
			} catch (error: any) {
				throw new Error(
					`Failed to fetch latest version from npm registry: ${error.message}`,
				);
			}
		}

		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		const result = await client.updatePackage(username, funcName, req.name, version);
		return { success: true, package: result };
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to update package",
		};
	}
}
