from config import mcp, app_config, log_event
from api_client import MicroFnAPIClient

@mcp.tool()
def rename_function(function_id: str, new_name: str) -> dict:
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
    log_event(f"rename_function tool called for function_id: {function_id} with new_name: {new_name}")
    token = app_config.microfn_api_token
    if not token:
        log_event(
            "MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables."
        )
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )
    client = MicroFnAPIClient(token=token)
    result = client.update_workspace_name(function_id, new_name)
    log_event(f"rename_function result: {result}")
    return result
