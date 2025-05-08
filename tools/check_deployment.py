from config import mcp, app_config
from api_client import MicroFnAPIClient


@mcp.tool()
async def check_deployment(function_id: str, ctx) -> dict:
    """
    Gets the latest deployment for a function.

    Args:
        function_id (str): Function ID.

    Returns:
        dict: The latest deployment object.
    """
    await ctx.info(f"Checking deployment for function {function_id}")
    token = app_config.microfn_api_token
    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )
    client = MicroFnAPIClient(token=token)
    result = client.get_latest_deployment(function_id)
    await ctx.info("Retrieved latest deployment")
    await ctx.debug(f"Deployment details: {result}")
    return result
