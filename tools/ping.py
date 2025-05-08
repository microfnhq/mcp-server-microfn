from config import mcp


@mcp.tool()
async def ping(ctx) -> str:
    """
    Responds with 'pong' to test server connectivity.

    Returns:
        str: The string 'pong'.
    """
    await ctx.debug("Ping request received")
    await ctx.info("Responding with pong")
    return "pong"
