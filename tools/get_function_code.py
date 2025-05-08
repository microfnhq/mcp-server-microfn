from config import mcp, app_config
from api_client import MicroFnAPIClient


@mcp.tool()
async def get_function_code(function_id: str, ctx) -> str:
    """
    Gets the code for a function.

    Args:
        function_id (str): Function ID.

    Returns:
        str: The code for the function.
    """
    await ctx.info(f"Getting code for function {function_id}")
    token = app_config.microfn_api_token
    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )
    client = MicroFnAPIClient(token=token)
    code = client.get_workspace_code(function_id)
    await ctx.debug(f"Retrieved code: {code}")
    return code
