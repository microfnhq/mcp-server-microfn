from config import mcp, app_config, log_event
from api_client import MicroFnAPIClient


@mcp.tool()
def get_function_code(function_id: str) -> str:
    """
    Gets the code for a function.

    Args:
        function_id (str): Function ID.

    Returns:
        str: The code for the function.
    """
    log_event(f"get_function_code tool called for function {function_id}")
    token = app_config.microfn_api_token
    if not token:
        log_event(
            "MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables."
        )
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )
    client = MicroFnAPIClient(token=token)
    code = client.get_workspace_code(function_id)
    log_event(f"get_function_code result: {code}")
    return code
