// my-mcp-server/src/tools/installPackage.ts

import { MicroFnApiClient } from "../microfnApiClient.js";

export interface InstallPackageRequest {
	functionId: string;
	name: string;
	version?: string;
}

export interface InstallPackageResponse {
	success: boolean;
	package?: { name: string; version: string };
	error?: string;
}

/**
 * Installs an npm package for a function.
 * @param token - API token for authentication
 * @param req - Object containing functionId, name, and optional version
 * @returns Installed package info or error
 */
export async function handleInstallPackage(
	token: string,
	req: InstallPackageRequest,
	env: any,
	ctx: ExecutionContext,
): Promise<InstallPackageResponse> {
	try {
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
		const result = await client.installPackage(req.functionId, req.name, version);
		return { success: true, package: result };
	} catch (error: any) {
		return {
			success: false,
			error: error.message || "Failed to install package",
		};
	}
}
