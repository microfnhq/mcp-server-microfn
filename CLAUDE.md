# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is an MCP (Model Context Protocol) server for the MicroFn platform - a Cloudflare Worker that provides MCP tools for managing serverless functions. The server acts as a bridge between MCP clients and the MicroFn REST API.

## Development Commands

```bash
# Local development server
npm run dev
# or
npm start

# Deploy to Cloudflare Workers
npm run deploy

# Code formatting and linting
npm run format
npm run lint:fix
```

## Architecture

**Core Components:**
- `src/index.ts` - Main server setup with OAuth provider and routing
- `src/AuthenticatedMCP.ts` - Durable Object for SSE transport
- `src/StreamableHTTPHandler.ts` - Handler for HTTP transport (stateless)
- `src/mcpServerFactory.ts` - Shared MCP server configuration
- `src/microfnApiClient.ts` - HTTP client for MicroFn REST API
- `src/tools/` - Individual tool implementations (15 tools total)

**Endpoints:**
- `/sse` - Server-Sent Events endpoint for MCP over SSE (legacy)
- `/mcp` - HTTP endpoint for streamable-http transport (recommended)
- `/authorize`, `/callback` - OAuth authentication flow
- `/logout` - Session cleanup

**Tool Architecture:**
Each tool in `src/tools/` follows a consistent pattern:
- Exports a tool definition object with `name`, `description`, `inputSchema`
- Exports a handler function that takes `(args, client)` parameters
- Uses Zod schemas for input validation
- Returns structured responses via the `MicroFnAPIClient`

## Authentication

The server supports multiple authentication strategies:
- Bearer tokens via Authorization headers
- Session-based token storage using Durable Objects
- Environment variable fallbacks
- Token extraction from various request contexts

Authentication tokens are MicroFn API tokens that must be obtained from the MicroFn platform.

## Key Dependencies

- `@agents-sdk/core` - Core MCP agent framework
- `@modelcontextprotocol/sdk` - MCP protocol implementation
- `zod` - Runtime type validation
- `wrangler` - Cloudflare Workers CLI

## Adding New Tools

### Tool Structure
Tools are organized in two parts:

1. **Tool Handler** (`src/tools/[toolName].ts`)
   - Contains the actual implementation logic
   - Interfaces for request/response types
   - Uses `MicroFnApiClient` for API calls
   - Always takes `token` as first parameter

2. **Tool Registration** (`src/index.ts` in `createMcpTools()`)
   - Defines the MCP tool schema and description
   - Maps input parameters to handler function
   - Handles errors and response formatting

### Step-by-Step Process

1. **Create Tool Handler** (`src/tools/newTool.ts`):
```typescript
import { MicroFnApiClient } from "../microfnApiClient";

export interface NewToolRequest {
  functionId: string;
  // other parameters
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
```

2. **Add API Client Method** (if needed in `src/microfnApiClient.ts`):
```typescript
async someApiMethod(functionId: string): Promise<SomeResult> {
  const res = await fetch(`${this.baseUrl}/workspaces/${functionId}/endpoint`, {
    method: "GET",
    headers: this.getHeaders(),
  });
  if (!res.ok) throw new Error(`Failed to call API: ${res.statusText}`);
  const data = await res.json() as { result?: SomeResult };
  return data.result || {} as SomeResult;
}
```

3. **Import Handler** in `src/index.ts`:
```typescript
import { handleNewTool } from "./tools/newTool";
```

4. **Register Tool** in `createMcpTools()` function:
```typescript
newTool: {
  description: "Description of what this tool does",
  inputSchema: {
    type: "object",
    properties: {
      functionId: { type: "string" },
      // match your handler's interface exactly
    },
    required: ["functionId"],
  },
  handler: async (args) => {
    try {
      const result = await handleNewTool(
        apiToken,
        args,
        {},
        {} as ExecutionContext,
      );
      return { content: [{ type: "text", text: JSON.stringify(result) }] };
    } catch (error: any) {
      return {
        content: [{ type: "text", text: `Error: ${error.message}` }],
      };
    }
  },
},
```

5. **Add to Legacy Tool Endpoint** (optional, in `/tool` handler):
```typescript
const toolHandlers: Record<string, Function> = {
  // existing tools...
  newTool: handleNewTool,
};
```

### Important Guidelines

**Parameter Naming**:
- Use `functionId` for workspace/function IDs (matches Python API)
- Match handler interface exactly in `inputSchema`
- Don't use `workspaceId`/`functionName` - use what the handler expects

**Authentication**:
- All tools (except `ping`) receive `apiToken` as first parameter
- Token is extracted from `Authorization: Bearer <token>` header
- Each request creates a new `MicroFnApiClient` instance with the token

**Error Handling**:
- Always wrap handler calls in try/catch
- Return consistent error format with `{ content: [{ type: "text", text: "Error: ..." }] }`
- Log errors for debugging

**API Alignment**:
- Check `../api_client.py` for parameter names and API endpoints
- Use same base URLs: `https://microfn.dev/api` and `https://microfn.dev/run`
- Match request/response formats from Python implementation

### Testing

1. Run `npm run type-check` to verify TypeScript compilation
2. Test with `npm run dev` and call your tool via MCP protocol
3. Verify authentication works by testing with valid bearer token

## Development Notes

- Built for Cloudflare Workers runtime (ES2022 modules)
- Stateless operation - no session persistence
- TypeScript configuration targets ES2022
- Biome used for code formatting and linting
- Direct JSON-RPC implementation for MCP protocol