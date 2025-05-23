# Building a Remote MCP Server on Cloudflare with MicroFn Authentication

This example allows you to deploy a remote MCP server on Cloudflare Workers that authenticates with the MicroFn API.

## Authentication

This MCP server requires a MicroFn API token to access authenticated endpoints like `list_functions`. The token is passed from the client to the server via the `Authorization` header:

```
Authorization: Bearer mfn_your_token_here
```

For more details on the authentication implementation, see [AUTHENTICATION.md](./AUTHENTICATION.md).

## Get started: 

[![Deploy to Workers](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/ai/tree/main/demos/remote-mcp-microfn)

This will deploy your MCP server to a URL like: `remote-mcp-server-authless.<your-account>.workers.dev/sse`

Alternatively, you can use the command line below to get the remote MCP Server created on your local machine:
```bash
npm create cloudflare@latest -- my-mcp-server --template=cloudflare/ai/demos/remote-mcp-microfn
```

## Customizing your MCP Server

To add your own [tools](https://developers.cloudflare.com/agents/model-context-protocol/tools/) to the MCP server, define each tool inside the `init()` method of `src/index.ts` using `this.server.tool(...)`. 

## Connect to Cloudflare AI Playground

You can connect to your MCP server from the Cloudflare AI Playground, which is a remote MCP client:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL (`remote-mcp-server-microfn.<your-account>.workers.dev/sse`)
3. Add your MicroFn API token in the authorization field
4. You can now use your MCP tools directly from the playground!

## Connect Claude Desktop to your MCP server

You can also connect to your remote MCP server from local MCP clients, by using the [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote). 

To connect to your MCP server from Claude Desktop, follow [Anthropic's Quickstart](https://modelcontextprotocol.io/quickstart/user) and within Claude Desktop go to Settings > Developer > Edit Config.

Update with this configuration:

```json
{
  "mcpServers": {
    "microfn": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "http://localhost:8787/sse"  // or remote-mcp-server-microfn.your-account.workers.dev/sse
      ],
      "headers": {
        "Authorization": "Bearer mfn_your_token_here" // Add your MicroFn API token here
      }
    }
  }
}
```

Restart Claude and you should see the tools become available. 
