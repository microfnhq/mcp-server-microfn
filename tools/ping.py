from config import mcp
from fastmcp import Context


@mcp.tool()
async def ping(ctx: Context) -> str:
    """
    Responds with 'pong' to test server connectivity.

    Returns:
        str: The string 'pong'.
    """
    await ctx.debug("Ping request received")
    await ctx.info("Responding with pong")
    return "pong"
