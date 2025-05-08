from config import mcp, app_config
from api_client import MicroFnAPIClient
from fastmcp import Context


@mcp.tool()
async def list_functions(ctx: Context) -> list:
    """
    Lists all functions for the authenticated user using the MicroFn API.

    Returns:
        list: List of function objects.
    """
    await ctx.info("Listing all functions")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )

    client = MicroFnAPIClient(token=token)
    workspaces = client.get_workspaces()
    await ctx.info(f"Found {len(workspaces)} functions")
    await ctx.debug(f"Functions list: {workspaces}")
    return workspaces
