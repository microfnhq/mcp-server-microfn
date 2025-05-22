// listFunctions.ts
import { MyDurableObjectEnv } from "../index";
import { MicroFnApiClient, Workspace } from "../microfnApiClient";

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
		const client = new MicroFnApiClient(token);
		const workspaces = await client.listWorkspaces();
		return { workspaces };
	} catch (err: any) {
		return {
			error: err?.message || "Unknown error occurred while listing functions.",
		};
	}
}

// TypeScript interface for Workspace is assumed to be exported from microfnApiClient.ts
