<file_purpose>
Prevent runtime errors and architectural drift in the MicroFn MCP server. Ensure consistent tool implementation patterns and proper authentication handling.
</file_purpose>

<assistant_expectations>
• Emit TypeScript code in fenced blocks with proper imports
• Use Zod schemas for all MCP tool parameter validation
• Reference MicroFnApiClient for all API interactions
• Apply Biome formatting after every code change
• Validate UUID formats for functionId parameters
</assistant_expectations>

<repo_info github="https://github.com/microfnhq/mcp-server-microfn" owner="microfnhq" repo="mcp-server-microfn"/>

<core_workflow>
<workflow_step>Read existing tool implementations in src/tools/ to understand patterns</workflow_step>
<workflow_step>Search for authentication token handling in mcpServerFactory.ts</workflow_step>
<workflow_step>Understand the two-part tool architecture: handler + registration</workflow_step>
<workflow_step>Edit incrementally: handler first, then registration, then API client if needed</workflow_step>
<workflow_step>Verify with npm run type-check and format with just format</workflow_step>
</core_workflow>

<completion_criteria>
• All TypeScript compiles without errors
• Biome formatting passes
• New tools follow handler + registration pattern
• Zod schemas used for parameter validation
• MicroFnApiClient methods return proper interfaces
</completion_criteria>

<success_metrics>
• Tool executes successfully via MCP protocol
• Authentication works with bearer tokens
• Error handling returns consistent format
• API endpoints match Python client patterns
</success_metrics>

<code_review_rules>
• Use Zod schemas for all MCP tool parameters
<rule_rationale for="zod-schemas">McpAgent wrapper requires Zod to extract JSON-RPC parameters correctly</rule_rationale>
• Pass apiToken as first parameter to all tool handlers
• Create new MicroFnApiClient instance per request
• Use functionId parameter name in user-facing tools
<rule_rationale for="function-id">Maintains consistency with Python API client naming</rule_rationale>
• Wrap all handler calls in try/catch blocks
• Return structured responses via content array format
</code_review_rules>

<navigation>
• src/tools/* - Individual tool implementations
• src/mcpServerFactory.ts - Tool registration and MCP server setup
• src/microfnApiClient.ts - HTTP client for MicroFn REST API
• src/index.ts - Main server with OAuth and routing
</navigation>

<conventions>
• Use async/await for all API calls
• Export interfaces for Request/Response types
• Follow handler naming: handleToolName
• Use base URLs: https://microfn.dev/api and https://microfn.dev/run
• Apply ES2022 module syntax throughout
</conventions>

<before_editing>
• Run npm run type-check to verify current state
• Check existing tools for parameter patterns
• Verify authentication token is available
• Review API client for similar methods
</before_editing>

<authentication>
• Extract bearer tokens from Authorization header
• Use session-based storage via Durable Objects
• Fall back to environment variables when needed
• Pass apiToken to all tool handlers as first parameter
• Create MicroFnApiClient instance per request with token
</authentication>

<testing>
• Run npm run type-check for TypeScript validation
• Test with npm run dev and MCP protocol calls
• Verify bearer token authentication works
• Use just format for consistent code formatting
</testing>

<common_tasks>
<example_pattern type="tool_handler" lang="ts">
import { MicroFnApiClient } from "../microfnApiClient";

export interface NewToolRequest {
  functionId: string;
}

export interface NewToolResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export async function handleNewTool(
  token: string,
  req: NewToolRequest,
  env: any,
  ctx: ExecutionContext,
): Promise<NewToolResponse> {
  try {
    const client = new MicroFnApiClient(token);
    const result = await client.someApiMethod(req.functionId);
    return { success: true, data: result };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
</example_pattern>

<example_pattern type="tool_registration" lang="ts">
import { z } from 'zod';

server.tool(
  'newTool',
  'Description of tool functionality',
  {
    functionId: z.string().uuid().describe('The UUID of the function'),
  },
  async ({ functionId }) => {
    try {
      const result = await handleNewTool(
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
</example_pattern>
</common_tasks>

<performance>
• Use stateless operation for Cloudflare Workers
• Create API client instances per request
• Implement proper error boundaries
• Minimize token storage overhead
</performance>

<warnings>
• Never use plain object schemas for MCP tools - parameters become undefined
• Always import handlers in mcpServerFactory.ts or tools won't be available
• Match handler interface exactly in inputSchema
• Use UUID validation for functionId parameters
</warnings>

<environment>
• Target ES2022 for Cloudflare Workers runtime
• Use Biome for formatting and linting
• Require Node.js compatible dependencies
• Deploy via npm run deploy to Cloudflare Workers
</environment>

<api_architecture>
• Base URL: https://microfn.dev/api for management operations
• Run URL: https://microfn.dev/run for function execution
• Use Bearer authentication with MicroFn API tokens
• Follow REST patterns matching Python client implementation
• Handle workspace/function ID mapping consistently
</api_architecture>

<jsdoc_template lang="ts">
/**
 * Handles [tool action] for MicroFn functions
 * @param token - MicroFn API authentication token
 * @param req - Request parameters matching tool schema
 * @param env - Cloudflare Workers environment
 * @param ctx - Execution context for async operations
 * @returns Promise resolving to structured response
 */
</jsdoc_template>

<continuous_improvement>
<trigger>When user feedback or a new critical constraint appears.</trigger>
<action>
At task end, output: **Suggested CLAUDE.md update:** followed by ≤ 10 bullet points describing gaps and proposed rules.
</action>
</continuous_improvement>

<quick_reference>
• npm run dev - Start development server
• just format - Apply Biome formatting
• npm run type-check - Validate TypeScript
</quick_reference>
