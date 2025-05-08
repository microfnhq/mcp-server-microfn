from config import mcp, app_config
from api_client import MicroFnAPIClient
from fastmcp import Context


@mcp.tool()
async def execute_function(function_id: str, input_data: dict, ctx: Context) -> dict:
    """
    Executes the main function in the specified workspace using POST /run/{workspace_id} with a JSON body.

    Args:
        function_id (str): Function ID.
        input_data (dict): JSON payload to send.

    Returns:
        dict: The response from the run endpoint.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    await ctx.info(f"Executing function {function_id}")
    await ctx.debug(f"Input data: {input_data}")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )

    client = MicroFnAPIClient(token=token)
    result = client.execute_function(function_id, input_data)
    await ctx.info("Function execution completed")
    await ctx.debug(f"Result: {result}")
    return result
