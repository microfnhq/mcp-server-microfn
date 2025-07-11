// listFunctions.ts
import { Env } from "../index";
import { MicroFnApiClient, type Workspace } from "../microfnApiClient.js";

/**
 * Retrieves the list of all functions/workspaces using MicroFnApiClient.
 * @param env Cloudflare Worker environment
 * @returns Array of Workspace objects or an error object
 */
export async function handleListFunctions(
	token: string,
	_params: any,
	env: any,
	ctx: ExecutionContext,
): Promise<{ workspaces?: Workspace[]; error?: string }> {
	try {
		const client = new MicroFnApiClient(token, env.API_BASE_URL);
		const workspaces = await client.listWorkspaces();
		return { workspaces };
	} catch (err: any) {
		return {
			error: err?.message || "Unknown error occurred while listing functions.",
		};
	}
}

// TypeScript interface for Workspace is assumed to be exported from microfnApiClient.ts
