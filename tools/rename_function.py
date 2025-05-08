from config import mcp, app_config
from api_client import MicroFnAPIClient

@mcp.tool()
async def rename_function(function_id: str, new_name: str, ctx) -> dict:
    """
    Renames a function (workspace) by its ID.

    Args:
        function_id (str): The ID of the function (workspace) to rename.
        new_name (str): The new name for the function (workspace).

    Returns:
        dict: The updated workspace object.

    Raises:
        RuntimeError: If the API token is not configured or the request fails.

    Example:
        result = mcp.rename_function({ "function_id": "abc123", "new_name": "MyRenamedFunction" })
    """
    await ctx.info(f"Renaming function {function_id} to {new_name}")
    token = app_config.microfn_api_token
    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )
    client = MicroFnAPIClient(token=token)
    result = client.update_workspace_name(function_id, new_name)
    await ctx.info("Function renamed successfully")
    await ctx.debug(f"Rename result: {result}")
    return result
