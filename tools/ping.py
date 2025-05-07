from config import mcp, log_event


@mcp.tool()
def ping() -> str:
    """
    Responds with 'pong' to test server connectivity.

    Returns:
        str: The string 'pong'.
    """
    log_event("ping tool called")
    return "pong"
