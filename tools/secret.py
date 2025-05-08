from config import mcp, app_config
from api_client import MicroFnAPIClient


@mcp.tool()
async def get_secrets(workspace_id: str, ctx) -> list:
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
    await ctx.info(f"Getting secrets for workspace {workspace_id}")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError("MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server.")

    client = MicroFnAPIClient(token=token)
    secrets = client.get_secrets(workspace_id)
    await ctx.debug(f"Retrieved secrets: {secrets}")
    return secrets


@mcp.tool()
async def create_secret(workspace_id: str, key: str, value: str, ctx) -> list:
    """
    Creates a new secret for the specified function (workspace).
    
    Note:
        Secrets cannot be overwritten. If a secret with the same key already exists,
        you must delete it first before creating a new one with the same key.

    Example (retrieving secrets in your function code):
        ```js
        import secret from "@microfn/secret";
        const url = await secret.getRequired("DISCORD_WEBHOOK_URL");
        ```

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
    await ctx.info(f"Creating secret with key '{key}' for workspace {workspace_id}")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError("MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server.")

    client = MicroFnAPIClient(token=token)
    secrets = client.create_secret(workspace_id, key, value)
    await ctx.info("Secret created successfully")
    await ctx.debug(f"Updated secrets list: {secrets}")
    return secrets


@mcp.tool()
async def delete_secret(workspace_id: str, secret_id: str, ctx) -> dict:
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
    await ctx.info(f"Deleting secret {secret_id} from workspace {workspace_id}")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError("MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server.")

    client = MicroFnAPIClient(token=token)
    result = client.delete_secret(workspace_id, secret_id)
    await ctx.info("Secret deleted successfully")
    await ctx.debug(f"Delete result: {result}")
    return result
