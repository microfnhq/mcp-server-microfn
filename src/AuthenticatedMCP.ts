import { McpAgent } from "agents/mcp";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
import { decodeJwt } from "jose";
import type { UserProps } from "./types";
import type { Env } from "./index";
import { createMcpServer } from "./mcpServerFactory.js";
import { WorkspaceCache, type WorkspaceInfo } from "./workspaceCache.js";

export class AuthenticatedMCP extends McpAgent<Env, {}, UserProps> {
	server!: McpServer;
	private workspaceCache!: WorkspaceCache;
	private toolRefs = new Map<string, RegisteredTool>();

	async init() {
		console.log("[AuthenticatedMCP] Init called with props:", {
			hasTokenSet: !!this.props.tokenSet,
			hasIdToken: !!this.props.tokenSet?.idToken,
			hasAccessToken: !!this.props.tokenSet?.accessToken,
			userEmail: this.props.claims?.email,
			userSub: this.props.claims?.sub,
			tokenSetTTL: this.props.tokenSet?.accessTokenTTL,
			hasRefreshToken: !!this.props.tokenSet?.refreshToken,
		});

		// Use the Auth0 ID token (not access token) for API authentication
		const apiToken = this.props.tokenSet?.idToken;

		if (!apiToken) {
			console.error(
				"[AuthenticatedMCP] No Auth0 ID token available for user:",
				this.props.claims?.email,
			);
			console.error("[AuthenticatedMCP] Props:", {
				tokenSet: this.props.tokenSet,
				claims: this.props.claims,
			});
			throw new Error("No Auth0 ID token available for this user. Please re-authenticate.");
		}

		console.log("[AuthenticatedMCP] Using Auth0 ID token for user:", this.props.claims?.email);
		console.log("[AuthenticatedMCP] ID token prefix:", apiToken.substring(0, 10) + "...");

		// Decode the ID token to check expiration
		try {
			const tokenPayload = decodeJwt(apiToken);
			const currentTime = Math.floor(Date.now() / 1000);
			const tokenExp = tokenPayload.exp as number;
			const tokenIat = tokenPayload.iat as number;
			
			console.log("[AuthenticatedMCP] Token details:", {
				issuedAt: new Date(tokenIat * 1000).toISOString(),
				expiresAt: new Date(tokenExp * 1000).toISOString(),
				currentTime: new Date(currentTime * 1000).toISOString(),
				isExpired: currentTime >= tokenExp,
				timeUntilExpiration: tokenExp - currentTime,
			});

			// Check if token is expired
			if (currentTime >= tokenExp) {
				console.error("[AuthenticatedMCP] Auth0 ID token is expired!");
				throw new Error("Auth0 ID token has expired. Please re-authenticate.");
			}

			// Warn if token is about to expire (within 5 minutes)
			const timeUntilExpiration = tokenExp - currentTime;
			if (timeUntilExpiration < 300) {
				console.warn("[AuthenticatedMCP] Token expires in less than 5 minutes!");
			}
		} catch (error) {
			console.error("[AuthenticatedMCP] Failed to decode ID token:", error);
			throw new Error("Invalid Auth0 ID token. Please re-authenticate.");
		}

		// Initialize workspace cache
		this.workspaceCache = new WorkspaceCache(this.ctx.storage, this.toolRefs);

		// Use the shared server factory with callback to collect tool references
		this.server = createMcpServer(
			apiToken,
			this.props,
			this.env,
			(tools) => {
				// Store tool references for later updates
				for (const [name, tool] of tools) {
					this.toolRefs.set(name, tool);
				}
			},
			this.workspaceCache,
		);

		// Try to load cached workspaces and update tool descriptions
		const cachedWorkspaces = await this.workspaceCache.getCached();
		if (cachedWorkspaces) {
			console.log("[AuthenticatedMCP] Found cached workspaces:", cachedWorkspaces.length);
			this.workspaceCache.updateToolDescriptions(cachedWorkspaces);
		} else {
			console.log("[AuthenticatedMCP] No cached workspaces found, fetching fresh...");
			// Fetch workspaces on init
			await this.fetchAndCacheWorkspaces(apiToken);
		}

		// Add debug logging to the server's transport
		const originalConnect = this.server.connect.bind(this.server);
		this.server.connect = async (transport: any) => {
			console.log("[AuthenticatedMCP] Connecting transport");

			// Intercept transport messages
			const originalOnMessage = transport.onmessage;
			transport.onmessage = (message: any) => {
				console.log("[AuthenticatedMCP] Incoming MCP message:", JSON.stringify(message));
				if (originalOnMessage) {
					originalOnMessage(message);
				}
			};

			return originalConnect(transport);
		};
	}

	async fetchAndCacheWorkspaces(apiToken: string): Promise<void> {
		try {
			const { handleListFunctions } = await import("./tools/listFunctions.js");
			const result = await handleListFunctions(
				apiToken,
				{},
				this.env,
				{} as ExecutionContext,
			);

			if (result.workspaces && Array.isArray(result.workspaces)) {
				console.log("[AuthenticatedMCP] Fetched", result.workspaces.length, "workspaces");
				const workspaceInfos: WorkspaceInfo[] = result.workspaces.map((ws) => ({
					id: ws.id,
					name: ws.name,
				}));
				await this.workspaceCache.updateCache(workspaceInfos);
			}
		} catch (error) {
			console.error("[AuthenticatedMCP] Failed to fetch workspaces:", error);
		}
	}

	// Expose method for mcpServerFactory to use
	getWorkspaceCache(): WorkspaceCache {
		return this.workspaceCache;
	}
}
