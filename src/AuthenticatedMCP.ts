import { McpAgent } from 'agents/mcp';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { UserProps } from './types';
import type { Env } from './index';

// Import all tool handlers
import { handleCheckDeployment } from "./tools/checkDeployment.js";
import { handleCreateFunction } from "./tools/createFunction.js";
import { handleExecuteFunction } from "./tools/executeFunction.js";
import { handleGetFunctionCode } from "./tools/getFunctionCode.js";
import { handleListFunctions } from "./tools/listFunctions.js";
import { handleListPackages } from "./tools/listPackages.js";
import { handleInstallPackage } from "./tools/installPackage.js";
import { handleUpdatePackage } from "./tools/updatePackage.js";
import { handleRemovePackage } from "./tools/removePackage.js";
import { handleUpdatePackageLayer } from "./tools/updatePackageLayer.js";
import { handleRenameFunction } from "./tools/renameFunction.js";
import { handleGetSecrets } from "./tools/getSecrets.js";
import { handleCreateSecret } from "./tools/createSecret.js";
import { handleDeleteSecret } from "./tools/deleteSecret.js";
import { handleUpdateFunctionCode } from "./tools/updateFunctionCode.js";

export class AuthenticatedMCP extends McpAgent<Env, {}, UserProps> {
  server = new McpServer({
    name: 'MicroFn MCP Server',
    version: '1.0.0',
  })

  async init() {
    // Use the MicroFn PAT from token exchange
    const apiToken = this.props.microfnToken;
    
    if (!apiToken) {
      console.error('[MCP] No MicroFn PAT available for user:', this.props.claims.email);
      console.error('[MCP] Token exchange may have failed during authentication');
      throw new Error('No MicroFn API token available for this user. Please re-authenticate.');
    }
    
    console.log('[MCP] Using MicroFn PAT for user:', this.props.claims.email);

    // Debug tool to show current user info
    this.server.tool('whoami', "Get the current user's details", {}, async () => ({
      content: [{ 
        type: 'text', 
        text: JSON.stringify({
          email: this.props.claims.email,
          sub: this.props.claims.sub,
          name: this.props.claims.name,
          hasMicrofnToken: !!apiToken
        }, null, 2) 
      }],
    }))

    // Ping tool
    this.server.tool('ping', 'Simple ping tool to test connectivity', {}, async () => ({
      content: [{ type: 'text', text: 'pong' }],
    }))

    // List functions
    this.server.tool('list_functions', 'List all available MicroFn workspaces', {}, async () => {
      try {
        const result = await handleListFunctions(
          apiToken,
          {},
          this.env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    })

    // Check deployment
    this.server.tool(
      'checkDeployment',
      'Check the deployment status of a function',
      {
        functionId: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleCheckDeployment(
            apiToken,
            {
              functionId: args.functionId,
            },
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Create function
    this.server.tool(
      'createFunction',
      'Create a new function',
      {
        name: { type: 'string' },
        code: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleCreateFunction(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Execute function
    this.server.tool(
      'executeFunction',
      'Execute a function with given input',
      {
        functionId: { type: 'string' },
        inputData: {},
      },
      async (args: any) => {
        try {
          const result = await handleExecuteFunction(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Get function code
    this.server.tool(
      'getFunctionCode',
      'Get the source code of a function',
      {
        functionId: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleGetFunctionCode(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Update function code
    this.server.tool(
      'updateFunctionCode',
      'Update the source code of a function',
      {
        functionId: { type: 'string' },
        code: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleUpdateFunctionCode(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // List packages
    this.server.tool(
      'listPackages',
      'Lists all npm packages installed for a function',
      {
        functionId: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleListPackages(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Install package
    this.server.tool(
      'installPackage',
      'Installs an npm package for a function',
      {
        functionId: { type: 'string' },
        name: { type: 'string' },
        version: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleInstallPackage(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Update package
    this.server.tool(
      'updatePackage',
      'Updates an npm package version for a function',
      {
        functionId: { type: 'string' },
        name: { type: 'string' },
        version: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleUpdatePackage(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Remove package
    this.server.tool(
      'removePackage',
      'Removes an npm package from a function',
      {
        functionId: { type: 'string' },
        name: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleRemovePackage(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Update package layer
    this.server.tool(
      'updatePackageLayer',
      "Updates the Lambda layer with the function's packages",
      {
        functionId: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleUpdatePackageLayer(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Rename function
    this.server.tool(
      'renameFunction',
      'Rename a function/workspace',
      {
        functionId: { type: 'string' },
        newName: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleRenameFunction(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Get secrets
    this.server.tool(
      'getSecrets',
      'Retrieves all secrets for the specified function (workspace)',
      {
        workspaceId: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleGetSecrets(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Create secret
    this.server.tool(
      'createSecret',
      'Creates a new secret for the specified function (workspace). Secrets cannot be overwritten - delete first if key exists.',
      {
        workspaceId: { type: 'string' },
        key: { type: 'string' },
        value: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleCreateSecret(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )

    // Delete secret
    this.server.tool(
      'deleteSecret',
      'Deletes a secret from the specified function (workspace)',
      {
        workspaceId: { type: 'string' },
        secretId: { type: 'string' },
      },
      async (args: any) => {
        try {
          const result = await handleDeleteSecret(
            apiToken,
            args,
            this.env,
            {} as ExecutionContext,
          );
          return { content: [{ type: 'text', text: JSON.stringify(result) }] };
        } catch (error: any) {
          return {
            content: [{ type: 'text', text: `Error: ${error.message}` }],
          };
        }
      }
    )
  }
}