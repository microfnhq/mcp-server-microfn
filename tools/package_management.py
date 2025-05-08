from config import mcp, app_config
from api_client import MicroFnAPIClient
from fastmcp import Context
import httpx
import json
from typing import List, Optional


@mcp.tool()
async def list_packages(function_id: str, ctx: Context) -> List[dict]:
    """
    Lists all npm packages installed for a function.

    Args:
        function_id (str): Function ID to list packages for.

    Returns:
        list: List of package objects with name and version.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    await ctx.info(f"Listing packages for function {function_id}")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )

    url = f"https://microfn.dev/api/workspaces/{function_id}/packages"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        result = response.json()
        
    await ctx.info(f"Found {len(result.get('packages', []))} packages")
    return result.get("packages", [])


@mcp.tool()
async def install_package(function_id: str, name: str, version: Optional[str] = None, ctx: Context = None) -> dict:
    """
    Installs an npm package for a function.

    Args:
        function_id (str): Function ID to install the package for.
        name (str): Package name to install.
        version (Optional[str]): Package version to install. If not specified or set to 'latest',
                               the latest version will be fetched from npm registry.

    Returns:
        dict: The installed package object.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    # Fetch latest version from npm if not specified
    if not version or version == 'latest':
        async with httpx.AsyncClient() as client:
            try:
                npm_response = await client.get(f"https://registry.npmjs.org/{name}/latest", timeout=10)
                npm_response.raise_for_status()
                version = npm_response.json().get('version')
                await ctx.info(f"Using latest version {version} from npm registry")
            except httpx.HTTPError as e:
                await ctx.error(f"Failed to fetch latest version from npm registry: {str(e)}")
                raise
    
    await ctx.info(f"Installing package {name}@{version} for function {function_id}")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )

    url = f"https://microfn.dev/api/workspaces/{function_id}/packages"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json", "Content-Type": "application/json"}
    data = {"name": name, "version": version}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data, timeout=20)
        response.raise_for_status()
        result = response.json()
        
    await ctx.info(f"Successfully installed package {name}@{version}")
    return result.get("package", {})


@mcp.tool()
async def update_package(function_id: str, name: str, version: Optional[str] = None, ctx: Context = None) -> dict:
    """
    Updates an npm package version for a function.

    Args:
        function_id (str): Function ID to update the package for.
        name (str): Package name to update.
        version (Optional[str]): New package version. If not specified or set to 'latest',
                               the latest version will be fetched from npm registry.

    Returns:
        dict: The updated package object.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    # Fetch latest version from npm if not specified
    if not version or version == 'latest':
        async with httpx.AsyncClient() as client:
            try:
                npm_response = await client.get(f"https://registry.npmjs.org/{name}/latest", timeout=10)
                npm_response.raise_for_status()
                version = npm_response.json().get('version')
                await ctx.info(f"Using latest version {version} from npm registry")
            except httpx.HTTPError as e:
                await ctx.error(f"Failed to fetch latest version from npm registry: {str(e)}")
                raise
    
    await ctx.info(f"Updating package {name} to version {version} for function {function_id}")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )

    url = f"https://microfn.dev/api/workspaces/{function_id}/packages/{name}"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json", "Content-Type": "application/json"}
    data = {"version": version}
    
    async with httpx.AsyncClient() as client:
        response = await client.put(url, headers=headers, json=data, timeout=20)
        response.raise_for_status()
        result = response.json()
        
    await ctx.info(f"Successfully updated package {name} to version {version}")
    return result.get("package", {})


@mcp.tool()
async def remove_package(function_id: str, name: str, ctx: Context) -> dict:
    """
    Removes an npm package from a function.

    Args:
        function_id (str): Function ID to remove the package from.
        name (str): Package name to remove.

    Returns:
        dict: Success response.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    await ctx.info(f"Removing package {name} from function {function_id}")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )

    url = f"https://microfn.dev/api/workspaces/{function_id}/packages/{name}"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    
    async with httpx.AsyncClient() as client:
        response = await client.delete(url, headers=headers, timeout=10)
        response.raise_for_status()
        result = response.json()
        
    await ctx.info(f"Successfully removed package {name}")
    return result


@mcp.tool()
async def update_package_layer(function_id: str, ctx: Context) -> dict:
    """
    Updates the Lambda layer with the function's packages.

    Args:
        function_id (str): Function ID to update the package layer for.

    Returns:
        dict: Success response.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    await ctx.info(f"Updating package layer for function {function_id}")
    token = app_config.microfn_api_token

    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )

    url = f"https://microfn.dev/api/workspaces/{function_id}/packages/update-layer"
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/json"}
    
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, timeout=30)
        response.raise_for_status()
        result = response.json()
        
    await ctx.info("Successfully updated package layer")
    return result
