# MicroFn MCP Server (Python)

This is a FastMCP server for the MicroFn project. It exposes MCP tools for integration and automation.

---

## Features

- **Ping tool**: Test the server with a simple ping/pong.
- **list_functions tool**: Lists all functions for the authenticated user via the MicroFn API.
- **execute_function tool**: Executes the main function in a specified workspace using the `/run/{workspace_id}` endpoint with a JSON body.

---

## Getting Started

### Prerequisites

- Python 3.8+
- [FastMCP](https://gofastmcp.com/) (see below)
- A valid MicroFn API token (set as the `MICROFN_API_TOKEN` environment variable)

### Install dependencies

```sh
pip install -r requirements.txt
```

### Run the server

Set your MicroFn API token in the environment:

```sh
export MICROFN_API_TOKEN=your_microfn_api_token_here
python my_server.py
```

Or, using FastMCP CLI (if installed globally):

```sh
fastmcp run my_server.py:mcp
```

Or, to run locally with uvx and FastMCP dev mode:

```sh
uvx fastmcp dev server.py
```

---

## MCP Integration Example

To use this server as an MCP tool provider, add the following to your MCP settings:

```json
  "microfn-mcp": {
    "command": "uvx",
    "args": [
      "--from",
      "git+https://github.com/microfnhq/mcp-server-microfn",
      "server"
    ],
    "env": {
      "MICROFN_API_TOKEN": "<token>"
    }
  }
```

Replace the token values with your own as needed.

---

## Usage

The server exposes the following tools:

- `ping`: Returns `"pong"`.
- `list_functions`: Returns a list of all functions for the authenticated user (requires `MICROFN_API_TOKEN` to be set).
- `execute_function`: Executes the main function in the specified workspace using the `/run/{workspace_id}` endpoint.

  - Arguments:
    - `function_id` (str): Function ID.
    - `input_data` (dict): JSON payload to send.
  - Returns: The response from the run endpoint.

- `create_function`: Creates a new function (workspace) with the given name and code.

  - Arguments:
    - `name` (str): Name for the function/workspace.
    - `code` (str): Initial code for the function.
  - Returns: The created workspace object.

  **Example:**
  ```js
  // Create a simple function that returns the sum of two numbers
  const code = `
  export default async function main(input) {
    return input.a + input.b;
  }
  `;
  const result = await mcp.create_function({ name: "Adder", code });
  ```

  **Advanced Example (calling another function):**
  ```js
  // Suppose you want to create a function that calls another function by ID
  import fn from "@microfn/fn";
  const targetFunctionId = "e6a08dec-2206-46fa-bbe0-d760124b57ab";
  const code = `
  import fn from "@microfn/fn";
  export default async function main(input) {
    // Call another function by its ID
    const result = await fn.executeFunction("${targetFunctionId}", input);
    return result;
  }
  `;
  const result = await mcp.create_function({ name: "ProxyCaller", code });
  ```

- `get_function_code`: Gets the code for a function (workspace).

  - Arguments:
    - `function_id` (str): Function ID.
  - Returns: The code for the workspace.

- `update_function_code`: Updates the code for a function (workspace).

  - Arguments:
    - `function_id` (str): Function ID.
    - `code` (str): The new code to set.
  - Returns: The response from the update endpoint.

  **Example:**
  ```js
  // Update a function to log its input and return it
  const code = `
  export default async function main(input) {
    console.log("Received input:", input);
    return input;
  }
  `;
  await mcp.update_function_code({ function_id: "abc123", code });
  ```

  **Advanced Example (cross-function invocation):**
  ```js
  // Update a function to call another function and process its result
  import fn from "@microfn/fn";
  const targetFunctionId = "e6a08dec-2206-46fa-bbe0-d760124b57ab";
  const code = `
  import fn from "@microfn/fn";
  export default async function main(input) {
    // Call another function and add 10 to its result
    const result = await fn.executeFunction("${targetFunctionId}", input);
    return result + 10;
  }
  `;
  await mcp.update_function_code({ function_id: "abc123", code });
  ```

- `check_deployment`: Gets the latest deployment for a function (workspace).
  - Arguments:
    - `function_id` (str): Function ID.
  - Returns: The latest deployment object.

- `get_secrets`: Retrieves all secrets for the specified function (workspace).
  - Arguments:
    - `workspace_id` (str): The function (workspace) ID.
  - Returns: List of secret objects for the function.

- `create_secret`: Creates a new secret for the specified function (workspace).
  - **Note:** Secrets cannot be overwritten. If a secret with the same key already exists, you must delete it first before creating a new one with the same key.
  - Arguments:
    - `workspace_id` (str): The function (workspace) ID.
    - `key` (str): The secret key.
    - `value` (str): The secret value.
  - Returns: List of secret objects after creation.
  - **How to retrieve secrets in your function code:**
    ```js
    import secret from "@microfn/secret";
    const url = await secret.getRequired("DISCORD_WEBHOOK_URL");
    ```

- `delete_secret`: Deletes a secret from the specified function (workspace).
  - Arguments:
    - `workspace_id` (str): The function (workspace) ID.
    - `secret_id` (str): The secret ID.
  - Returns: Empty dict on success.

You can test these with a FastMCP client or by sending a tool call via stdio.

---

## Project Structure

- `my_server.py` — Main entry point, defines the MCP server and tools.

---

## License

MIT

---

Slay your automations with MicroFn + MCP 🛹
