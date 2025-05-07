# MicroFn MCP Server (Python)

This is a FastMCP server for the MicroFn project. It exposes MCP tools for integration and automation.

---

## Features

- **Ping tool**: Test the server with a simple ping/pong.
- **list_workspaces tool**: Lists all workspaces for the authenticated user via the MicroFn API.

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

---

## Usage

The server exposes the following tools:

- `ping`: Returns `"pong"`.
- `list_workspaces`: Returns a list of all workspaces for the authenticated user (requires `MICROFN_API_TOKEN` to be set).

You can test these with a FastMCP client or by sending a tool call via stdio.

---

## Project Structure

- `my_server.py` — Main entry point, defines the MCP server and tools.

---

## License

MIT

---

Slay your automations with MicroFn + MCP 🛹