import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { UserProps } from './types';
import type { Env } from './index';
import { createMcpServer } from './mcpServerFactory.js';

export class AuthenticatedMCP extends McpAgent<Env, {}, UserProps> {
  server!: McpServer;

  async init() {
    console.log('[AuthenticatedMCP] Init called with props:', {
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
      console.error('[AuthenticatedMCP] No MicroFn PAT available for user:', this.props.claims?.email);
      console.error('[AuthenticatedMCP] Props:', {
        microfnToken: this.props.microfnToken,
        tokenSet: this.props.tokenSet,
        claims: this.props.claims,
      });
      throw new Error('No MicroFn API token available for this user. Please re-authenticate.');
    }
    
    console.log('[AuthenticatedMCP] Using MicroFn PAT for user:', this.props.claims?.email);
    console.log('[AuthenticatedMCP] Token prefix:', apiToken.substring(0, 10) + '...');

    // Use the shared server factory
    this.server = createMcpServer(apiToken, this.props, this.env);
    
    // Add debug logging to the server's transport
    const originalConnect = this.server.connect.bind(this.server);
    this.server.connect = async (transport: any) => {
      console.log('[AuthenticatedMCP] Connecting transport');
      
      // Intercept transport messages
      const originalOnMessage = transport.onmessage;
      transport.onmessage = (message: any) => {
        console.log('[AuthenticatedMCP] Incoming MCP message:', JSON.stringify(message));
        if (originalOnMessage) {
          originalOnMessage(message);
        }
      };
      
      return originalConnect(transport);
    };
  }
}