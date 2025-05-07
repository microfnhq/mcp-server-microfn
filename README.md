# MicroFn MCP Server (Python)

This is a FastMCP server for the MicroFn project. It exposes MCP tools for integration and automation.

---

## Features

- **Ping tool**: Test the server with a simple ping/pong.

---

## Getting Started

### Prerequisites

- Python 3.8+
- [FastMCP](https://gofastmcp.com/) (see below)

### Install dependencies

```sh
pip install -r requirements.txt
```

### Run the server

```sh
python my_server.py
```

Or, using FastMCP CLI (if installed globally):

```sh
fastmcp run my_server.py:mcp
```

---

## Usage

The server exposes a single tool:

- `ping`: Returns `"pong"`.

You can test it with a FastMCP client or by sending a tool call via stdio.

---

## Project Structure

- `my_server.py` — Main entry point, defines the MCP server and tools.

---

## License

MIT

---

Slay your automations with MicroFn + MCP 🛹