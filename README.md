# Microfn remote MCP

Early-stage MCP server for interacting with the microfn platform

## Authentication

This MCP server requires a MicroFn API token to access authenticated endpoints. Get yours at https://microfn.dev/settings

```
Authorization: Bearer mfn_your_token_here
```

## Config

Update with this configuration:

```json
{
  "mcpServers": {
    "microfn": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "--header 'Authorization: Bearer <token>'",
        "https://mcp-server-microfn.cf-mfn.workers.dev/mcp"
      ]
    }
  }
}
```

Restart Claude and you should see the tools become available.
