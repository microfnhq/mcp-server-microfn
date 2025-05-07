from fastmcp import FastMCP

mcp = FastMCP("MicroFn MCP Server")


@mcp.tool()
def ping() -> str:
    """
    Responds with 'pong' to test server connectivity.

    Returns:
        str: The string 'pong'.
    """
    return "pong"


if __name__ == "__main__":
    mcp.run()
