# MicroFn MCP Server (Cloudflare Workers, TypeScript)

This project is a Cloudflare Workers MCP server for the MicroFn platform, written in TypeScript. It exposes MCP tools for integration and automation, deployable globally on Cloudflare's edge network.

---

## Features

- **Cloudflare Workers-native:** Fast, scalable, and serverless.
- **TypeScript:** Type-safe tool definitions and logic.
- **MCP Tool Registry:** Easily add, update, and document tools.
- **API-first:** Simple HTTP endpoints for tool listing and invocation.

---

## Getting Started

### Prerequisites

- Node.js 18+
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/)
- A Cloudflare account (for deployment)

### Install dependencies

```sh
npm install
```

### Local development

Start the development server:

```sh
npm run dev
```

The server will be available at `http://localhost:8787`.

### Deploy to Cloudflare

```sh
npm run deploy
```

---

## Usage

### List available tools

**Endpoint:**  
`GET /tools`

**Response:**
```json
[
  {
    "name": "hello_world",
    "description": "Returns a greeting."
  }
]
```

### Invoke a tool

**Endpoint:**  
`POST /tool/{name}`

**Body:**  
Tool-specific JSON arguments.

**Example:**
```sh
curl -X POST http://localhost:8787/tool/hello_world -H "Content-Type: application/json" -d '{}'
```

**Response:**
```json
{ "message": "Hello from Cloudflare Workers MCP server!" }
```

---

## Adding New Tools

1. Open `src/index.ts`.
2. Add your tool to the `tools` array:
   ```ts
   {
     name: "my_tool",
     description: "Describe what your tool does.",
     handler: async (args) => {
       // Tool logic here
       return { result: "Tool output" };
     }
   }
   ```
3. The tool will be automatically available via `/tools` and `/tool/my_tool`.

---

## Project Structure

- `src/index.ts` — Main entry point, tool registry, and HTTP routing.
- `wrangler.toml` — Cloudflare Workers configuration.
- `package.json` — Project metadata and scripts.
- `tsconfig.json` — TypeScript configuration.

---

## Environment Variables

Add secrets or environment variables in `wrangler.toml` under `[vars]` or using `wrangler secret put`.

---

## Development Tips

- Use the [MCP Inspector](https://github.com/modelcontextprotocol/inspector) to test your server:
  ```sh
  npx @modelcontextprotocol/inspector@latest
  ```
- Connect to `http://localhost:8787` or your deployed Worker URL.

---

## License

MIT

---

Slay your automations with MicroFn + MCP 🛹 (Cloudflare Workers Edition)
