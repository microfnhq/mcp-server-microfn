from config import mcp, app_config, log_event
from api_client import MicroFnAPIClient


@mcp.tool()
def check_deployment(function_id: str) -> dict:
    """
    Gets the latest deployment for a function.

    Args:
        function_id (str): Function ID.

    Returns:
        dict: The latest deployment object.
    """
    log_event(f"check_deployment tool called for function {function_id}")
    token = app_config.microfn_api_token
    if not token:
        log_event(
            "MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables."
        )
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )
    client = MicroFnAPIClient(token=token)
    result = client.get_latest_deployment(function_id)
    log_event(f"check_deployment result: {result}")
    return result
