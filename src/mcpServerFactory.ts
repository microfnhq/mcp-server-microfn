import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import type { UserProps } from './types.js';
import type { Env } from './index.js';

// Import all tool handlers
import { handleCheckDeployment } from "./tools/checkDeployment.js";
import { handleCreateFunction } from "./tools/createFunction.js";
import { handleCreateSecret } from "./tools/createSecret.js";
import { handleDeleteSecret } from "./tools/deleteSecret.js";
import { handleExecuteFunction } from "./tools/executeFunction.js";
import { handleGetFunctionCode } from "./tools/getFunctionCode.js";
import { handleGetSecrets } from "./tools/getSecrets.js";
import { handleInstallPackage } from "./tools/installPackage.js";
import { handleListFunctions } from "./tools/listFunctions.js";
import { handleListPackages } from "./tools/listPackages.js";
import { handleRemovePackage } from "./tools/removePackage.js";
import { handleRenameFunction } from "./tools/renameFunction.js";
import { handleUpdateFunctionCode } from "./tools/updateFunctionCode.js";
import { handleUpdatePackage } from "./tools/updatePackage.js";
import { handleUpdatePackageLayer } from "./tools/updatePackageLayer.js";

/**
 * Creates and configures an MCP server instance with all MicroFn tools
 * This factory is shared between SSE and Streamable-HTTP transports
 */
export function createMcpServer(apiToken: string, props: UserProps, env: Env): McpServer {
  console.log('[mcpServerFactory] Creating MCP server:', {
    hasApiToken: !!apiToken,
    tokenPrefix: apiToken ? apiToken.substring(0, 10) + '...' : 'none',
    userEmail: props.claims?.email,
    userSub: props.claims?.sub,
  });
  
  const server = new McpServer({
    name: 'MicroFn MCP Server',
    version: '1.0.0',
  });

  // Debug tool to show current user info
  server.tool('whoami', "Get the current user's details", {}, async (extra: any) => {
    console.log('[mcpServerFactory] whoami called - extra:', extra);
    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify({
          email: props.claims?.email,
          sub: props.claims?.sub,
          name: props.claims?.name,
          hasMicrofnToken: !!apiToken,
          tokenPrefix: apiToken ? apiToken.substring(0, 10) + '...' : 'none',
          debug: {
            extra_type: typeof extra,
            extra_keys: extra ? Object.keys(extra) : null
          }
        }, null, 2) 
      }],
    };
  });

  // Ping tool
  server.tool('ping', 'Simple ping tool to test connectivity', {}, async (extra: any) => {
    console.log('[mcpServerFactory] ping - extra:', extra);
    return {
      content: [{ type: 'text', text: 'pong' }],
    };
  });
  
  // Test tool with parameters
  server.tool('test_params', 'Test tool to debug parameter passing', {
    testParam: z.string().describe('A test parameter')
  }, async ({ testParam }) => {
    console.log('[mcpServerFactory] test_params called with testParam:', testParam);
    
    return {
      content: [{ 
        type: 'text', 
        text: JSON.stringify({
          received: {
            testParam
          }
        }, null, 2) 
      }],
    };
  });

  // List functions
  server.tool('list_functions', 'List all available MicroFn workspaces/functions. Returns an array of workspaces where each workspace.id can be used as functionId parameter in other tools.', {}, async (extra: any) => {
    console.log('[mcpServerFactory] list_functions called with extra:', extra);
    console.log('[mcpServerFactory] list_functions details:', {
      hasApiToken: !!apiToken,
      tokenPrefix: apiToken ? apiToken.substring(0, 10) + '...' : 'none',
    });
    
    try {
      const result = await handleListFunctions(
        apiToken,
        {},
        env,
        {} as ExecutionContext,
      );
      console.log('[mcpServerFactory] list_functions result:', {
        hasError: !!result.error,
        workspaceCount: result.workspaces?.length || 0,
      });
      return { content: [{ type: 'text', text: JSON.stringify(result) }] };
    } catch (error: any) {
      console.error('[mcpServerFactory] list_functions error:', error.message);
      return {
        content: [{ type: 'text', text: `Error: ${error.message}` }],
      };
    }
  });

  // Check deployment
  server.tool(
    'checkDeployment',
    'Check the deployment status of a function. Requires functionId parameter.',
    {
      functionId: z.string().describe('The ID of the function/workspace to check deployment status')
    },
    async ({ functionId }) => {
      console.log('[mcpServerFactory] checkDeployment called with functionId:', functionId);
      
      try {
        const result = await handleCheckDeployment(
          apiToken,
          { functionId },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Create function
  server.tool(
    'createFunction',
    'Create a new function',
    {
      name: z.string(),
      code: z.string(),
    },
    async ({ name, code }) => {
      try {
        const result = await handleCreateFunction(
          apiToken,
          { name, code },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Execute function
  server.tool(
    'executeFunction',
    'Execute a function with given input. Requires functionId and optional inputData parameters.',
    {
      functionId: z.string().describe('The ID of the function/workspace to execute'),
      inputData: z.object({}).passthrough().optional().describe('Optional input data to pass to the function')
    },
    async ({ functionId, inputData }) => {
      console.log('[mcpServerFactory] executeFunction called:', { functionId, inputData });
      
      try {
        const result = await handleExecuteFunction(
          apiToken,
          { functionId, inputData },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Get function code
  server.tool(
    'getFunctionCode',
    'Get the source code of a function. Requires functionId parameter (NOT workspace).',
    {
      functionId: z.string().describe('The ID of the function/workspace to retrieve code from. This should be the exact function ID, not a workspace name.')
    },
    async ({ functionId }) => {
      console.log('[mcpServerFactory] getFunctionCode called with functionId:', functionId);
      
      try {
        const result = await handleGetFunctionCode(
          apiToken,
          { functionId },
          env,
          {} as ExecutionContext,
        );
        console.log('[mcpServerFactory] getFunctionCode result:', {
          hasError: !!result.error,
          hasCode: !!result.code,
        });
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        console.error('[mcpServerFactory] getFunctionCode error:', error.message);
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Update function code
  server.tool(
    'updateFunctionCode',
    'Update the source code of a function. Requires functionId and code parameters.',
    {
      functionId: z.string().describe('The ID of the function/workspace to update'),
      code: z.string().describe('The new source code for the function')
    },
    async ({ functionId, code }) => {
      console.log('[mcpServerFactory] updateFunctionCode called:', { functionId, codeLength: code?.length });
      
      try {
        const result = await handleUpdateFunctionCode(
          apiToken,
          { functionId, code },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // List packages
  server.tool(
    'listPackages',
    'Lists all npm packages installed for a function. Requires functionId parameter.',
    {
      functionId: z.string().describe('The ID of the function/workspace to list packages for')
    },
    async ({ functionId }) => {
      console.log('[mcpServerFactory] listPackages called with functionId:', functionId);
      
      try {
        const result = await handleListPackages(
          apiToken,
          { functionId },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Install package
  server.tool(
    'installPackage',
    'Installs an npm package for a function',
    {
      functionId: z.string(),
      name: z.string(),
      version: z.string(),
    },
    async ({ functionId, name, version }) => {
      try {
        const result = await handleInstallPackage(
          apiToken,
          { functionId, name, version },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Update package
  server.tool(
    'updatePackage',
    'Updates an npm package version for a function',
    {
      functionId: z.string(),
      name: z.string(),
      version: z.string(),
    },
    async ({ functionId, name, version }) => {
      try {
        const result = await handleUpdatePackage(
          apiToken,
          { functionId, name, version },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Remove package
  server.tool(
    'removePackage',
    'Removes an npm package from a function',
    {
      functionId: z.string(),
      name: z.string(),
    },
    async ({ functionId, name }) => {
      try {
        const result = await handleRemovePackage(
          apiToken,
          { functionId, name },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Update package layer
  server.tool(
    'updatePackageLayer',
    "Updates the Lambda layer with the function's packages",
    {
      functionId: z.string(),
    },
    async ({ functionId }) => {
      try {
        const result = await handleUpdatePackageLayer(
          apiToken,
          { functionId },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Rename function
  server.tool(
    'renameFunction',
    'Rename a function/workspace',
    {
      functionId: z.string(),
      newName: z.string(),
    },
    async ({ functionId, newName }) => {
      try {
        const result = await handleRenameFunction(
          apiToken,
          { functionId, newName },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Get secrets
  server.tool(
    'getSecrets',
    'Retrieves all secrets for the specified function (workspace)',
    {
      workspaceId: z.string(),
    },
    async ({ workspaceId }) => {
      try {
        const result = await handleGetSecrets(
          apiToken,
          { workspaceId },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Create secret
  server.tool(
    'createSecret',
    'Creates a new secret for the specified function (workspace). Secrets cannot be overwritten - delete first if key exists.',
    {
      workspaceId: z.string(),
      key: z.string(),
      value: z.string(),
    },
    async ({ workspaceId, key, value }) => {
      try {
        const result = await handleCreateSecret(
          apiToken,
          { workspaceId, key, value },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  // Delete secret
  server.tool(
    'deleteSecret',
    'Deletes a secret from the specified function (workspace)',
    {
      workspaceId: z.string(),
      secretId: z.string(),
    },
    async ({ workspaceId, secretId }) => {
      try {
        const result = await handleDeleteSecret(
          apiToken,
          { workspaceId, secretId },
          env,
          {} as ExecutionContext,
        );
        return { content: [{ type: 'text', text: JSON.stringify(result) }] };
      } catch (error: any) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }
    }
  );

  return server;
}