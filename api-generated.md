# API Reference

_This file is auto-generated from JSDoc in route files. Run `bun scripts/generate-api-docs.ts` to update._

## `workspaces.ts`

### `GET /workspaces/public`

**Description:** List all public workspaces with pagination.

**Returns:**
- {object} 200 - { workspaces: Array<object>, pagination: object }
- {object} 500 - If fetching fails.

**Example:**
```json
// Path: /api/workspaces/public?page=1&limit=10
// Response:
{
"workspaces": [ { "id": "ws-1", ... } ],
"pagination": { "total": 100, "page": 1, "limit": 10, "totalPages": 10 }
}
/
```


### `GET /workspaces/public/:userSlug/:wsId`

**Description:** Get a specific public workspace by user slug and workspace ID.

**Path Params:**
- {string} userSlug - User slug (path param)
- {string} wsId - Workspace ID (path param)

**Returns:**
- {object} 200 - { workspace: object }
- {object} 404 - If workspace not found or not public.
- {object} 500 - If fetching fails.

**Example:**
```json
// Path: /api/workspaces/public/johndoe/ws-123
// Response:
{ "workspace": { "id": "ws-123", "name": "...", ... } }
/
```


### `GET /workspaces`

**Description:** List all workspaces for the authenticated user.

**Returns:**
- {object} 200 - { workspaces: Array<object> }

**Example:**
```json
// Path: /api/workspaces
// Response:
{ "workspaces": [ { "id": "ws-1", ... } ] }
/
```


### `POST /workspaces`

**Description:** Create a new workspace.

**Body:**
- {string} [name] - Name for the workspace.
- {string} [initialCode] - Initial code for the workspace.

**Returns:**
- {object} 201 - { workspace: object }
- {object} 400 - If validation or code parsing fails.
- {object} 403 - If workspace limit reached.
- {object} 500 - If creation fails.

**Example:**
```json
// Path: /api/workspaces
// Request body:
{ "name": "My Workspace", "initialCode": "export function main() {}" }
// Response:
{ "workspace": { "id": "ws-1", ... } }
/
```


### `GET /workspaces/:wsid`

**Description:** Get a specific workspace by ID.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { workspace: object }
- {object} 404 - If workspace not found.

**Example:**
```json
// Path: /api/workspaces/ws-123
// Response:
{ "workspace": { "id": "ws-123", ... } }
/
```


### `DELETE /workspaces/:wsid`

**Description:** Delete a workspace by ID.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { message: "Workspace deleted" }

**Example:**
```json
// Path: /api/workspaces/ws-123
// Response:
{ "message": "Workspace deleted" }
/
```


### `POST /workspaces/:wsid/visibility`

**Description:** Update workspace visibility (public/private).

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Body:**
- {boolean} isPublic - Whether the workspace should be public.

**Returns:**
- {object} 200 - { workspace: object }
- {object} 404 - If workspace not found.
- {object} 500 - If update fails.

**Example:**
```json
// Path: /api/workspaces/ws-123/visibility
// Request body:
{ "isPublic": true }
// Response:
{ "workspace": { "id": "ws-123", "isPublic": true, ... } }
/
```


### `GET /workspaces/:wsid/agents`

**Description:** Get all agents that use a specific workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { agents: Array<object> }
- {object} 404 - If workspace not found.
- {object} 500 - If fetching fails.

**Example:**
```json
// Path: /api/workspaces/ws-123/agents
// Response:
{ "agents": [ { "id": "agent-1", ... } ] }
/
```


### `PATCH /workspaces/:wsid`

**Description:** Update workspace settings (name, hasPublicEndpoint, cron).

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Body:**
- {string} [name] - New name for the workspace.
- {boolean} [hasPublicEndpoint] - Whether the workspace has a public endpoint.
- {string|null} [cron] - Cron schedule.

**Returns:**
- {object} 200 - { workspace: object }
- {object} 400 - If no update data provided.
- {object} 404 - If workspace not found.
- {object} 500 - If update fails.

**Example:**
```json
// Path: /api/workspaces/ws-123
// Request body:
{ "name": "New Name", "hasPublicEndpoint": true, "cron": null }
// Response:
{ "workspace": { "id": "ws-123", "name": "New Name", ... } }
/
```


## `usage.ts`

### `GET /usage`

**Description:** Get current usage data for the authenticated user.

**Returns:**
- {object} 200 - Usage data object.
- {object} 500 - If fetching usage data fails.

**Example:**
```json
// Path: /api/usage
// Response:
{
"functionsExecuted": 123,
"tokensUsed": 4567,
...
}
/
```


## `microfn-modules.ts`

### `GET /api/microfn-modules`

**Returns:**
- {Object} JSON response containing module names as keys and their type definitions as values

**Example:**
```json
// Response format:
{
"modules": {
"moduleA": "export interface ModuleA { ... }",
"moduleB": "export type ModuleB = { ... }"
}
}
/
```


## `module.ts`

### `POST /module/kv`

**Description:** Perform a key-value operation (get or set) for a workspace.

**Body:**
- {string} operation - "get" or "set"
- {string} key - The key to get or set
- {any} [value] - The value to set (required for "set")
- {string} workspaceId - Workspace ID

**Returns:**
- {object} 200 - { success: true, data?: any }
- {object} 400 - If missing value for set or invalid operation
- {object} 500 - Internal server error

**Example:**
```json
// Request body for get:
{ "operation": "get", "key": "foo", "workspaceId": "abc123" }
// Response:
{ "success": true, "data": "bar" }
// Request body for set:
{ "operation": "set", "key": "foo", "value": "bar", "workspaceId": "abc123" }
// Response:
{ "success": true }
/
```


### `POST /module/secrets`

**Description:** Get all secrets for a workspace.

**Body:**
- {string} operation - Must be "get"
- {string} workspaceId - Workspace ID

**Returns:**
- {object} 200 - { secrets: Array<object> }
- {object} 400 - If invalid operation
- {object} 500 - If fetching secrets fails

**Example:**
```json
// Request body:
{ "operation": "get", "workspaceId": "abc123" }
// Response:
{ "secrets": [ { "key": "SECRET_KEY", ... } ] }
/
```


## `deployments.ts`

### `GET /workspaces/:wsid/deployments/latest`

**Description:** Get the latest deployment for a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { deployment: object }

**Example:**
```json
// Path: /api/workspaces/{wsid}/deployments/latest
// Response:
{ "deployment": { ... } }
/
```


## `logs.ts`

### `GET /workspaces/:wsid/logs`

**Description:** Get all logs for a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { logs: Array<object> }
- {object} 500 - If fetching logs fails.

**Example:**
```json
// Path: /api/workspaces/{wsid}/logs
// Response:
{ "logs": [ { "timestamp": "...", "message": "...", ... } ] }
/
```


## `secrets.ts`

### `GET /workspaces/:wsid/secrets`

**Description:** Get all secrets for a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { secrets: Array<object> }
- {object} 500 - If fetching secrets fails.

**Example:**
```json
// Path: /api/workspaces/{wsid}/secrets
// Response:
{ "secrets": [ { "key": "SECRET_KEY", ... } ] }
/
```


### `POST /workspaces/:wsid/secrets`

**Description:** Create a new secret for a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Body:**
- {string} key - Secret key.
- {string} value - Secret value.

**Returns:**
- {object} 200 - { secrets: Array<object> }

**Example:**
```json
// Path: /api/workspaces/{wsid}/secrets
// Request body:
{ "key": "SECRET_KEY", "value": "SECRET_VALUE" }
// Response:
{ "secrets": [ { "key": "SECRET_KEY", ... } ] }
/
```


### `DELETE /workspaces/:wsid/secrets/:secretId`

**Description:** Delete a secret from a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).
- {string} secretId - Secret ID (path param).

**Returns:**
- {object} 200 - Empty object on success.

**Example:**
```json
// Path: /api/workspaces/{wsid}/secrets/{secretId}
// Response:
{}
/
```


## `templates.ts`

### `GET /templates`

**Description:** List all available workspace templates.

**Returns:**
- {Array<object>} 200 - Array of template metadata.

**Example:**
```json
// Path: /api/templates
// Response:
[
{
"id": "template-1",
"name": "Starter Template",
"description": "A basic starter template",
"requiredEnvVars": ["API_KEY"]
}
]
/
```


### `POST /templates/create`

**Description:** Provision a new workspace from a template.

**Body:**
- {string} templateId - The template ID to use.
- {string} workspaceName - Name for the new workspace.
- {object} envVars - Environment variables required by the template.

**Returns:**
- {object} 200 - { workspace: object }
- {object} 400 - If validation fails or unknown error occurs.
- {object} 401 - If not authenticated.

**Example:**
```json
// Path: /api/templates/create
// Request body:
{
"templateId": "template-1",
"workspaceName": "My Workspace",
"envVars": { "API_KEY": "secret" }
}
// Response:
{ "workspace": { "id": "ws-123", ... } }
/
```


## `environment-variables.ts`

### `GET /workspaces/:wsid/environment`

**Description:** Get all environment variables (system and secrets) for a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { system: object, secrets: object }

**Throws:**
- 500 - If fetching environment variables fails.

**Example:**
```json
// Path: /api/workspaces/{wsid}/environment
// Response:
{
"system": {
"MICROFN_BASE_URL": { "description": "Base URL for the MicroFn API" },
"MICROFN_WORKSPACE_ID": { "description": "Current workspace identifier" },
"MICROFN_SA_TOKEN": { "description": "Service account token for this function" },
"MICROFN_FUNCTION_NAME": { "description": "Name of the current function" }
},
"secrets": {
"MY_SECRET": { "description": "Secret variable: MY_SECRET" }
}
}
/
```


## `agents.ts`

### `GET /`

**Description:** List all agents for the authenticated user.

**Returns:**
- {Array<object>} 200 - List of agents.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Response
[
{
"id": "agentId",
"name": "Agent Name",
"systemPrompt": "Prompt"
}
]
/
```


### `POST /`

**Description:** Create a new agent for the authenticated user.

**Body:**
- {string} name - Name of the agent.
- {string} systemPrompt - System prompt for the agent.

**Returns:**
- {object} 201 - The created agent.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Request body
{
"name": "Agent Name",
"systemPrompt": "Prompt"
}
// Response
{
"id": "agentId",
"name": "Agent Name",
"systemPrompt": "Prompt"
}
/
```


### `GET /:id`

**Description:** Get a specific agent by ID.

**Path Params:**
- {string} id - The agent ID.

**Returns:**
- {object} 200 - The agent object.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Response
{
"id": "agentId",
"name": "Agent Name",
"systemPrompt": "Prompt"
}
/
```


### `PATCH /:id`

**Description:** Update an agent's name or system prompt.

**Path Params:**
- {string} id - The agent ID.

**Body:**
- {string} [name] - New name for the agent.
- {string} [systemPrompt] - New system prompt.

**Returns:**
- {object} 200 - The updated agent.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Request body
{
"name": "New Name"
}
// Response
{
"id": "agentId",
"name": "New Name",
"systemPrompt": "Prompt"
}
/
```


### `DELETE /:id`

**Description:** Delete an agent by ID.

**Path Params:**
- {string} id - The agent ID.

**Returns:**
- {object} 200 - The deleted agent.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Response
{
"id": "agentId",
"name": "Agent Name",
"systemPrompt": "Prompt"
}
/
```


### `GET /:agentId/functions`

**Description:** Get all functions linked to an agent.

**Path Params:**
- {string} agentId - The agent ID.

**Returns:**
- {Array<object>} 200 - List of agent functions.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Response
[
{
"id": "functionLinkId",
"workspaceId": "workspaceId",
"functionName": "myFunction",
"description": "desc"
}
]
/
```


### `GET /:agentId/available_functions`

**Description:** Get all available functions that can be added to an agent.

**Path Params:**
- {string} agentId - The agent ID.

**Returns:**
- {Array<object>} 200 - List of available functions.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Response
[
{
"workspaceId": "uuid",
"workspaceName": "Workspace Name",
"functionName": "myFunction"
}
]
/
```


### `POST /:agentId/functions`

**Description:** Add a function (workspace) to an agent.

**Path Params:**
- {string} agentId - The agent ID.

**Body:**
- {string} workspaceId - The workspace UUID to link.
- {string} description - Description for the function link.

**Returns:**
- {object} 201 - The created agent function link.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Request body
{
"workspaceId": "uuid",
"description": "Linking this workspace"
}
// Response
{
"id": "functionLinkId",
"workspaceId": "workspaceId",
"functionName": "",
"description": "Linking this workspace"
}
/
```


### `PATCH /:agentId/functions/:functionId`

**Description:** Update the description of a function link for an agent.

**Path Params:**
- {string} agentId - The agent ID.
- {string} functionId - The function link ID.

**Body:**
- {string} description - New description.

**Returns:**
- {object} 200 - The updated function link.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Request body
{
"description": "Updated description"
}
// Response
{
"id": "functionLinkId",
"workspaceId": "workspaceId",
"functionName": "",
"description": "Updated description"
}
/
```


### `DELETE /:agentId/functions/:functionId`

**Description:** Remove a function link from an agent.

**Path Params:**
- {string} agentId - The agent ID.
- {string} functionId - The function link ID.

**Returns:**
- {object} 200 - { success: true }

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Response
{ "success": true }
/
```


### `GET /:agentId/executions`

**Description:** Get all executions for an agent.

**Path Params:**
- {string} agentId - The agent ID.

**Returns:**
- {Array<object>} 200 - List of executions.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Response
[
{
"executionId": "execId",
"status": "completed",
"output": "result"
}
]
/
```


### `GET /:agentId/executions/:executionId`

**Description:** Get a specific execution for an agent.

**Path Params:**
- {string} agentId - The agent ID.
- {string} executionId - The execution ID.

**Returns:**
- {object} 200 - The execution object.

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Response
{
"executionId": "execId",
"status": "completed",
"output": "result"
}
/
```


### `POST /:agentId/execute`

**Description:** Execute an agent with input.

**Path Params:**
- {string} agentId - The agent ID.

**Body:**
- {string} input - Input string for the agent.

**Returns:**
- {object} 202 - { executionId, output }

**Throws:**
- 500 - If user is not found.

**Example:**
```json
// Request body
{
"input": "Run this"
}
// Response
{
"executionId": "execId",
"output": "result"
}
/
```


### `GET /:agentId/triggers`

**Description:** Get all triggers for an agent.

**Path Params:**
- {string} agentId - The agent ID.

**Returns:**
- {Array<object>} 200 - List of triggers.

**Throws:**
- 500 - If user is not found or fetch fails.

**Example:**
```json
// Response
[
{
"triggerId": "triggerId",
"triggerType": "cron",
"configuration": "0 0 * * *"
}
]
/
```


### `POST /:agentId/triggers`

**Description:** Create a new trigger for an agent.

**Path Params:**
- {string} agentId - The agent ID.

**Body:**
- {string} triggerType - Type of trigger (e.g., "cron").
- {string} configuration - Trigger configuration (e.g., cron expression).

**Returns:**
- {object} 201 - The created trigger.

**Throws:**
- 400 - Missing or invalid fields.
- 500 - If user is not found or creation fails.

**Example:**
```json
// Request body
{
"triggerType": "cron",
"configuration": "0 0 * * *"
}
// Response
{
"triggerId": "triggerId",
"triggerType": "cron",
"configuration": "0 0 * * *"
}
/
```


### `DELETE /:agentId/triggers/:triggerId`

**Description:** Delete a trigger for an agent.

**Path Params:**
- {string} agentId - The agent ID.
- {string} triggerId - The trigger ID.

**Returns:**
- {null} 204 - Trigger deleted.

**Throws:**
- 404 - Trigger not found.
- 403 - Forbidden.
- 500 - If user is not found or deletion fails.


## `tokens.ts`

### `GET /tokens`

**Description:** List all personal access tokens for the authenticated user.

**Returns:**
- {Array<object>} 200 - Array of tokens.
- {object} 500 - If fetching tokens fails.

**Example:**
```json
// Path: /api/tokens
// Response:
[
{ "id": "token-1", "name": "My Token", ... }
]
/
```


### `POST /tokens`

**Description:** Create a new personal access token.

**Body:**
- {string} name - Token name.
- {string} [expiresAt] - Optional expiration date (ISO string).

**Returns:**
- {object} 201 - { secretToken: string }
- {object} 500 - If creation fails.

**Example:**
```json
// Path: /api/tokens
// Request body:
{ "name": "My Token", "expiresAt": "2024-12-31T23:59:59Z" }
// Response:
{ "secretToken": "..." }
/
```


### `DELETE /tokens/:tokenId`

**Description:** Revoke a personal access token.

**Path Params:**
- {string} tokenId - Token ID (path param).

**Returns:**
- {object} 200 - { success: true }
- {object} 500 - If revocation fails.

**Example:**
```json
// Path: /api/tokens/{tokenId}
// Response:
{ "success": true }
/
```


### `POST /tokens/validate`

**Description:** Validate a personal access token.

**Body:**
- {string} token - The token to validate.

**Returns:**
- {object} 200 - { valid: true, account: object }
- {object} 401 - { valid: false }
- {object} 500 - If validation fails.

**Example:**
```json
// Path: /api/tokens/validate
// Request body:
{ "token": "..." }
// Response:
{ "valid": true, "account": { ... } }
/
```


## `packages.ts`

### `GET /workspaces/:wsid/packages`

**Description:** Get all packages for a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { packages: Array<object> }
- {object} 400 - If workspace ID is missing.

**Example:**
```json
// Path: /api/workspaces/{wsid}/packages
// Response:
{ "packages": [ { "name": "lodash", "version": "4.17.21", ... } ] }
/
```


### `POST /workspaces/:wsid/packages`

**Description:** Add a new package to a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Body:**
- {string} name - Package name.
- {string} version - Package version.

**Returns:**
- {object} 201 - { package: object }
- {object} 400 - If workspace ID is missing or package already exists.

**Example:**
```json
// Path: /api/workspaces/{wsid}/packages
// Request body:
{ "name": "lodash", "version": "4.17.21" }
// Response:
{ "package": { "name": "lodash", "version": "4.17.21", ... } }
/
```


### `PUT /workspaces/:wsid/packages/:name`

**Description:** Update an existing package's version in a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).
- {string} name - Package name (path param).

**Body:**
- {string} version - New package version.

**Returns:**
- {object} 200 - { package: object }
- {object} 400 - If workspace ID or package name is missing.

**Example:**
```json
// Path: /api/workspaces/{wsid}/packages/lodash
// Request body:
{ "version": "4.17.22" }
// Response:
{ "package": { "name": "lodash", "version": "4.17.22", ... } }
/
```


### `DELETE /workspaces/:wsid/packages/:name`

**Description:** Delete a package from a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).
- {string} name - Package name (path param).

**Returns:**
- {object} 200 - { success: true }
- {object} 400 - If workspace ID or package name is missing.

**Example:**
```json
// Path: /api/workspaces/{wsid}/packages/lodash
// Response:
{ "success": true }
/
```


### `POST /workspaces/:wsid/packages/update-layer`

**Description:** Update the Lambda layer with the workspace's packages.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { success: true }
- {object} 400 - If workspace ID is missing.
- {object} 500 - If update fails.

**Example:**
```json
// Path: /api/workspaces/{wsid}/packages/update-layer
// Response:
{ "success": true }
/
```


## `code.ts`

### `POST /workspaces/:wsid/code`

**Description:** Update the code for a workspace. If only one exported function is found and it's not named "main", a main wrapper is injected.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Body:**
- {string} code - The code to update.

**Returns:**
- {object} 200 - { message: "Workspace code updated" }

**Throws:**
- 500 - If user is not found or update fails.

**Example:**
```json
// Path: /api/workspaces/{wsid}/code
// Request body:
{ "code": "export function foo() {}" }
// Response:
{ "message": "Workspace code updated" }
/
```


### `GET /workspaces/:wsid/code`

**Description:** Get the code for a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { code: string }

**Example:**
```json
// Path: /api/workspaces/{wsid}/code
// Response:
{ "code": "export function foo() {}" }
/
```


## `code-completion.ts`

### `POST /`

**Description:** Get code completion suggestions.

**Body:**
- {object} body - The request body containing code context and options.

**Returns:**
- {object} 200 - The completion result.

**Example:**
```json
// Request body
{
"prompt": "function add(a, b) {",
"language": "javascript"
}
// Response
{
"completion": "return a + b;\n}"
}
/
```


## `agent-functions.ts`

### `GET /agents/:agentId/available_functions`

**Description:** Get all available functions for an agent (functions that can be added).

**Path Params:**
- {string} agentId - The ID of the agent.

**Returns:**
- {Array<{workspaceId: string, workspaceName: string, functionName: string}>} 200 - List of available functions.
- {object} 401 - Unauthorized.
- {object} 404 - Account or agent not found.

**Example:**
```json
// Response
[
{
"workspaceId": "uuid",
"workspaceName": "Workspace Name",
"functionName": "myFunction"
}
]
/
```


### `GET /agents/:agentId/functions`

**Description:** Get all functions currently linked to an agent.

**Path Params:**
- {string} agentId - The ID of the agent.

**Returns:**
- {Array<object>} 200 - List of agent function links.
- {object} 401 - Unauthorized.
- {object} 404 - Account or agent not found.

**Example:**
```json
// Response
[
{
"id": "functionLinkId",
"agentId": "agentId",
"workspaceId": "workspaceId",
"functionName": "myFunction",
"description": "desc",
"Workspace": { "name": "Workspace Name" }
}
]
/
```


### `POST /agents/:agentId/functions`

**Description:** Add a function (workspace) to an agent.

**Path Params:**
- {string} agentId - The ID of the agent.

**Body:**
- {string} workspaceId - The workspace UUID to link.
- {string} description - Description for the function link.

**Returns:**
- {object} 201 - The created agent function link.
- {object} 401 - Unauthorized.
- {object} 404 - Account, agent, or workspace not found.
- {object} 400 - Workspace already linked to agent.

**Example:**
```json
// Request body
{
"workspaceId": "uuid",
"description": "Linking this workspace"
}
// Response
{
"id": "functionLinkId",
"agentId": "agentId",
"workspaceId": "workspaceId",
"functionName": "",
"description": "Linking this workspace"
}
/
```


### `PATCH /agents/:agentId/functions/:functionId`

**Description:** Update the description of a function link for an agent.

**Path Params:**
- {string} agentId - The ID of the agent.
- {string} functionId - The ID of the function link.

**Body:**
- {string} description - New description.

**Returns:**
- {object} 200 - The updated function link.
- {object} 401 - Unauthorized.
- {object} 404 - Account, agent, or function link not found.

**Example:**
```json
// Request body
{
"description": "Updated description"
}
// Response
{
"id": "functionLinkId",
"agentId": "agentId",
"workspaceId": "workspaceId",
"functionName": "",
"description": "Updated description"
}
/
```


### `DELETE /agents/:agentId/functions/:functionId`

**Description:** Remove a function link from an agent.

**Path Params:**
- {string} agentId - The ID of the agent.
- {string} functionId - The ID of the function link.

**Returns:**
- {object} 200 - { success: true }
- {object} 401 - Unauthorized.
- {object} 404 - Account, agent, or function link not found.

**Example:**
```json
// Response
{ "success": true }
/
```


## `generate.ts`

### `POST /workspaces/generate`

**Description:** Generate function code variations using LLMs based on a prompt.

**Body:**
- {string} prompt - The prompt to generate code for.

**Returns:**
- {object} 200 - { variations: [{ code: string }, { code: string }] }
- {object} 403 - If generation limit is reached.
- {object} 500 - If generation fails.

**Example:**
```json
// Path: /api/workspaces/generate
// Request body:
{ "prompt": "Write a function that adds two numbers" }
// Response:
{
"variations": [
{ "code": "export function add(a, b) { return a + b; }" },
{ "code": "function add(a, b) { return a + b; }" }
]
}
/
```


## `subscription.ts`

### `GET /subscription`

**Description:** Get the current subscription for the authenticated user.

**Returns:**
- {object} 200 - { subscription: object }
- {object} 500 - If fetching subscription fails.

**Example:**
```json
// Path: /api/subscription
// Response:
{ "subscription": { "tier": "pro", ... } }
/
```


### `GET /subscription/history`

**Description:** Get the subscription history for the authenticated user.

**Returns:**
- {object} 200 - { history: Array<object> }
- {object} 500 - If fetching history fails.

**Example:**
```json
// Path: /api/subscription/history
// Response:
{ "history": [ { "tier": "starter", ... }, { "tier": "pro", ... } ] }
/
```


### `GET /subscription/subscriptions`

**Description:** Get all available subscription tiers.

**Returns:**
- {object} 200 - { tiers: Array<object> }
- {object} 500 - If fetching tiers fails.

**Example:**
```json
// Path: /api/subscription/subscriptions
// Response:
{ "tiers": [ { "name": "starter", ... }, { "name": "pro", ... } ] }
/
```


## `run.ts`

### `POST /workspaces/:wsid/run`

**Description:** Run the main function in a workspace with the provided input.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Body:**
- {any} input - Input to pass to the function.

**Returns:**
- {object} 200 - { output: any }
- {object} 400 - If function not deployed, not found, or logical error.
- {object} 403 - If execution limit is reached.
- {object} 404 - If function not found.
- {object} 500 - If server error occurs.
- {object} 503 - If function connection fails.

**Example:**
```json
// Path: /api/workspaces/{wsid}/run
// Request body:
{ "input": { "a": 1, "b": 2 } }
// Response:
{ "output": 3 }
/
```


## `auth.ts`

### `POST /createSession`

**Description:** Create a session and get or create a user account.

**Body:**
- {object} session - Auth0 session object containing user, tokenSet, and internal info.
- {string} idToken - ID token string.

**Returns:**
- {object} 200 - { id: string } The created or found account ID.
- {object} 500 - Error object.

**Example:**
```json
// Request body
{
"session": {
"user": {
"nickname": "usernick",
"name": "User Name",
"picture": "https://...",
"updated_at": "2024-01-01T00:00:00Z",
"email": "user@email.com",
"email_verified": true,
"iss": "issuer",
"aud": "audience",
"sub": "auth0|123",
"iat": 1234567890,
"exp": 1234567999,
"sid": "sid",
"nonce": "nonce"
},
"tokenSet": {
"accessToken": "token",
"scope": "openid",
"refreshToken": "refresh",
"expiresAt": 1234567999
},
"internal": {
"sid": "sid",
"createdAt": 1234567890
}
},
"idToken": "idtoken"
}
// Response
{ "id": "accountId" }
/
```


### `GET /session`

**Description:** Get the current Auth0 session.

**Returns:**
- {object} 200 - { session: object } The current session object.

**Example:**
```json
// Response
{ "session": { ... } }
/
```


## `functions.ts`

### `GET /workspaces/:wsid/functions`

**Description:** Get all functions for a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).

**Returns:**
- {object} 200 - { functions: Array<object> }

**Example:**
```json
// Path: /api/workspaces/{wsid}/functions
// Response:
{ "functions": [ { "name": "main", ... } ] }
/
```


### `GET /workspaces/:wsid/functions/:name/config`

**Description:** Get the config for a specific function in a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).
- {string} name - Function name (path param).

**Returns:**
- {object} 200 - { fnConfig: object }

**Example:**
```json
// Path: /api/workspaces/{wsid}/functions/{name}/config
// Response:
{ "fnConfig": { "cron": "* * * * *", "isPublic": false, ... } }
/
```


### `POST /workspaces/:wsid/functions/:name/config`

**Description:** Create or update the config for a specific function in a workspace.

**Path Params:**
- {string} wsid - Workspace ID (path param).
- {string} name - Function name (path param).

**Body:**
- {string} cron - Cron schedule.
- {boolean} isPublic - Whether the function is public.

**Returns:**
- {object} 200 - { fnConfig: object }

**Example:**
```json
// Path: /api/workspaces/{wsid}/functions/{name}/config
// Request body:
{ "cron": "* * * * *", "isPublic": true }
// Response:
{ "fnConfig": { "cron": "* * * * *", "isPublic": true, ... } }
/
```

