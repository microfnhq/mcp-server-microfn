// my-mcp-server/src/tools/ping.ts

/**
 * Health check handler for the MCP server.
 * Returns a simple JSON response indicating server status.
 */

export interface PingResponse {
	status: "ok";
	message: "pong";
}

/**
 * Returns a health check response.
 * Can be called from the main worker handler.
 */
export function handlePing(): PingResponse {
	return {
		status: "ok",
		message: "pong",
	};
}
