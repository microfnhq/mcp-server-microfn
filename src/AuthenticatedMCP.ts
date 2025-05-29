import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import type { RegisteredTool } from "@modelcontextprotocol/sdk/server/mcp.js";
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
      hasMicrofnToken: !!this.props.microfnToken,
      userEmail: this.props.claims?.email,
      userSub: this.props.claims?.sub,
      tokenSetTTL: this.props.tokenSet?.accessTokenTTL,
      hasRefreshToken: !!this.props.tokenSet?.refreshToken,
    });

    // Use the MicroFn PAT from token exchange
    const apiToken = this.props.microfnToken;

    if (!apiToken) {
      console.error(
        "[AuthenticatedMCP] No MicroFn PAT available for user:",
        this.props.claims?.email
      );
      console.error("[AuthenticatedMCP] Props:", {
        microfnToken: this.props.microfnToken,
        tokenSet: this.props.tokenSet,
        claims: this.props.claims,
      });
      throw new Error(
        "No MicroFn API token available for this user. Please re-authenticate."
      );
    }

    console.log(
      "[AuthenticatedMCP] Using MicroFn PAT for user:",
      this.props.claims?.email
    );
    console.log(
      "[AuthenticatedMCP] Token prefix:",
      apiToken.substring(0, 10) + "..."
    );

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
      this.workspaceCache
    );

    // Try to load cached workspaces and update tool descriptions
    const cachedWorkspaces = await this.workspaceCache.getCached();
    if (cachedWorkspaces) {
      console.log(
        "[AuthenticatedMCP] Found cached workspaces:",
        cachedWorkspaces.length
      );
      this.workspaceCache.updateToolDescriptions(cachedWorkspaces);
    } else {
      console.log(
        "[AuthenticatedMCP] No cached workspaces found, fetching fresh..."
      );
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
        console.log(
          "[AuthenticatedMCP] Incoming MCP message:",
          JSON.stringify(message)
        );
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
        {} as ExecutionContext
      );

      if (result.workspaces && Array.isArray(result.workspaces)) {
        console.log(
          "[AuthenticatedMCP] Fetched",
          result.workspaces.length,
          "workspaces"
        );
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
