from config import mcp, app_config, log_event
from api_client import MicroFnAPIClient


@mcp.tool()
def list_functions() -> list:
    """
    Lists all functions for the authenticated user using the MicroFn API.

    Returns:
        list: List of function objects.
    """
    log_event("list_functions tool called")
    token = app_config.microfn_api_token

    if not token:
        log_event(
            "MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables."
        )
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )

    client = MicroFnAPIClient(token=token)
    workspaces = client.get_workspaces()
    log_event(f"list_functions result: {workspaces}")
    return workspaces
