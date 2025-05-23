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
- `src/index.ts` - Main MCP server (`MyMCP` class) extending `McpAgent`
- `src/microfnApiClient.ts` - HTTP client for MicroFn REST API
- `src/tools/` - Individual tool implementations (10 tools total)

**Endpoints:**
- `/sse` - Server-Sent Events endpoint for MCP over SSE
- `/mcp` - Standard MCP protocol endpoint  
- `/tool` - Direct tool execution endpoint

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

## Development Notes

- Built for Cloudflare Workers runtime (ES2022 modules)
- Uses Durable Objects for session persistence
- TypeScript configuration targets ES2022
- Biome used for code formatting and linting