# Microfn remote MCP

Early-stage MCP server for interacting with the microfn platform

## Authentication

This MCP server supports two authentication methods:

### Option 1: OAuth Authentication (Recommended)

The server now supports OAuth authentication via Auth0. On first connection, you'll be redirected to log in with your MicroFn account.

1. Configure the MCP client without a token:
   ```json
   {
     "mcpServers": {
       "microfn": {
         "command": "npx",
         "args": [
           "-y",
           "mcp-remote",
           "https://mcp-server-microfn.cf-mfn.workers.dev/mcp"
         ]
       }
     }
   }
   ```

2. On first use, visit `https://mcp-server-microfn.cf-mfn.workers.dev/authorize` to authenticate
3. After successful authentication, the server will remember your session

### Option 2: Personal Access Token (Legacy)

For backwards compatibility, you can still use a MicroFn API token. Get yours at https://microfn.dev/settings

```json
{
  "mcpServers": {
    "microfn": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "--header 'Authorization: Bearer mfn_your_token_here'",
        "https://mcp-server-microfn.cf-mfn.workers.dev/mcp"
      ]
    }
  }
}
```

## Local Development

For local development with OAuth:

1. Clone the repository
2. Install dependencies: `npm install`
3. Set up secrets:
   ```bash
   wrangler secret put AUTH0_CLIENT_SECRET
   wrangler secret put COOKIE_SECRET
   ```
4. Run the development server: `npm run dev`
5. The OAuth callback URL for localhost is automatically configured

## Deployment

Deploy to Cloudflare Workers:
```bash
npm run deploy
```

Make sure to configure the Auth0 application to include your production callback URL:
`https://mcp-server-microfn.cf-mfn.workers.dev/callback`
