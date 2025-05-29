# Microfn remote MCP

Remote MCP server for interacting with the microfn platform

## Setup as remote MCP (eg Claude)

1. Open remote MCP / integrations page
2. Set `https://mcp.microfn.dev/sse` as URL for the remote MCP

## Setup in local MCP clients

1. Configure the MCP client

```json
{
  "mcpServers": {
    "microfn": {
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.microfn.dev/sse"]
    }
  }
}
```

This will prompt you to authenticate with microfn

## Local Development

Create a `.dev.vars` file with local config for auth0 and microfn:

```
AUTH0_CLIENT_SECRET=xxxx
API_BASE_URL=http://localhost:3000/api
```

Start a dev server with

```
wrangler dev
```

Use the MCP inspector:

```
npx @modelcontextprotocol/inspector http://localhost:8787/sse
```
