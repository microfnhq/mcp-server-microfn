from config import mcp, app_config, log_event
from api_client import MicroFnAPIClient


@mcp.tool()
def get_secrets(workspace_id: str) -> list:
    """
    Retrieves all secrets for the specified function (workspace).

    Args:
        workspace_id (str): The function (workspace) ID.

    Returns:
        list: List of secret objects for the function.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    log_event(f"get_secrets tool called for workspace {workspace_id}")
    token = app_config.microfn_api_token

    if not token:
        log_event("MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables.")
        raise RuntimeError("MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server.")

    client = MicroFnAPIClient(token=token)
    secrets = client.get_secrets(workspace_id)
    log_event(f"get_secrets result: {secrets}")
    return secrets


@mc.tool()
def create_secret(workspace_id: str, key: str, value: str) -> list:
    """
    Creates a new secret for the specified function (workspace).

    Note:
        Secrets cannot be overwritten. If a secret with the same key already exists,
        you must delete it first before creating a new one with the same key.

    Args:
        workspace_id (str): The function (workspace) ID.
        key (str): The secret key.
        value (str): The secret value.

    Returns:
        list: List of secret objects after creation.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    log_event(f"create_secret tool called for workspace {workspace_id} with key: {key}")
    token = app_config.microfn_api_token

    if not token:
        log_event("MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables.")
        raise RuntimeError("MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server.")

    client = MicroFnAPIClient(token=token)
    secrets = client.create_secret(workspace_id, key, value)
    log_event(f"create_secret result: {secrets}")
    return secrets


@mcp.tool()
def delete_secret(workspace_id: str, secret_id: str) -> dict:
    """
    Deletes a secret from the specified function (workspace).

    Args:
        workspace_id (str): The function (workspace) ID.
        secret_id (str): The secret ID.

    Returns:
        dict: Empty dict on success.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    log_event(f"delete_secret tool called for workspace {workspace_id} and secret_id: {secret_id}")
    token = app_config.microfn_api_token

    if not token:
        log_event("MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables.")
        raise RuntimeError("MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server.")

    client = MicroFnAPIClient(token=token)
    result = client.delete_secret(workspace_id, secret_id)
    log_event(f"delete_secret result: {result}")
    return result
