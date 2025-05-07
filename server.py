import os
import httpx
import logging
from datetime import datetime
from pydantic_settings import BaseSettings, SettingsConfigDict
from fastmcp import FastMCP

# --- Logging Setup ---
LOG_FILE = "server.log"
logging.basicConfig(
    filename=LOG_FILE,
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
)


def log_event(message):
    print(message)
    logging.info(message)


# --- Pydantic Settings for Configuration ---
class AppSettings(BaseSettings):
    # We expect MICROFN_API_TOKEN to be set directly in the environment by the MCP client
    # So, no env_prefix is needed here.
    # Pydantic-settings will automatically look for environment variables matching field names.
    # It also supports .env files by default if python-dotenv is installed, but we are relying
    # on the MCP client to set the env var.
    model_config: SettingsConfigDict = SettingsConfigDict(
        env_file=None, extra="ignore"
    )  # Do not load .env, ignore extra fields

    microfn_api_token: str | None = (
        None  # Field name matches expected setting key, case-insensitive for env var
    )


# Load settings using Pydantic
try:
    app_config = AppSettings()
    # Log the loaded token for debugging (avoid in production if sensitive)
    if app_config.microfn_api_token:
        log_event(f"Pydantic AppSettings loaded MICROFN_API_TOKEN.")
    else:
        log_event("Pydantic AppSettings: MICROFN_API_TOKEN not found or is empty.")
except Exception as e:
    log_event(f"Error loading AppSettings with Pydantic: {e}")
    app_config = AppSettings(microfn_api_token=None)  # Ensure app_config exists

# Initialize FastMCP.
# We are not relying on mcp.settings for the API token anymore,
# but passing it doesn't hurt if FastMCP has a way to store/use it.
# The tools will now directly use app_config.
mcp_init_kwargs_for_fastmcp = {}
if app_config.microfn_api_token:
    mcp_init_kwargs_for_fastmcp["microfn_api_token_if_fastmcp_uses_it"] = (
        app_config.microfn_api_token
    )

mcp = FastMCP("MicroFn MCP Server", **mcp_init_kwargs_for_fastmcp)

# --- MicroFn API Client (Reusable) ---


class MicroFnAPIClient:
    def create_workspace_with_code(self, name: str, code: str) -> dict:
        """
        Creates a new workspace with the given name and initial code.

        Args:
            name (str): Name for the workspace.
            code (str): Initial code for the workspace.

        Returns:
            dict: The created workspace object.

        Raises:
            httpx.HTTPStatusError: If the request fails.
        """
        url = f"{self.BASE_URL}/workspaces"
        body = {"name": name, "initialCode": code}
        log_event(f"POST {url} with body: {body}")
        resp = httpx.post(url, headers=self._headers(), json=body, timeout=20)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json().get("workspace", {})

    def get_workspace_code(self, function_id: str) -> str:
        """
        Gets the code for a function.

        Args:
            function_id (str): Function ID.

        Returns:
            str: The code for the function.

        Raises:
            httpx.HTTPStatusError: If the request fails.
        """
        url = f"{self.BASE_URL}/workspaces/{function_id}/code"
        log_event(f"GET {url}")
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json().get("code", "")

    def update_workspace_code(self, function_id: str, code: str) -> dict:
        """
        Updates the code for a function.

        Args:
            function_id (str): Function ID.
            code (str): The new code to set.

        Returns:
            dict: The response from the update endpoint.

        Raises:
            httpx.HTTPStatusError: If the request fails.
        """
        url = f"{self.BASE_URL}/workspaces/{function_id}/code"
        body = {"code": code}
        log_event(f"POST {url} with body: {body}")
        resp = httpx.post(url, headers=self._headers(), json=body, timeout=20)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json()

    def get_latest_deployment(self, function_id: str) -> dict:
        """
        Gets the latest deployment for a function.

        Args:
            function_id (str): Function ID.

        Returns:
            dict: The latest deployment object.

        Raises:
            httpx.HTTPStatusError: If the request fails.
        """
        url = f"{self.BASE_URL}/workspaces/{function_id}/deployments/latest"
        log_event(f"GET {url}")
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json().get("deployment", {})

    BASE_URL = "http://localhost:3000/api"
    RUN_BASE_URL = "http://localhost:3000"

    def __init__(self, token: str):
        if not token:
            # This case should ideally be caught before calling the constructor
            log_event("MicroFnAPIClient initialized with no token.")
            raise ValueError("API token cannot be empty.")
        self.token = token
        log_event(
            f"MicroFnAPIClient initialized with token."
        )  # Avoid logging the token itself for security

    def _headers(self):
        headers = {
            "Authorization": f"Bearer {self.token}",
            "Accept": "application/json",
        }
        log_event(f"Request headers: {headers}")
        return headers

    def get_workspaces(self):
        url = f"{self.BASE_URL}/workspaces"
        log_event(f"GET {url}")
        resp = httpx.get(url, headers=self._headers(), timeout=10)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        return resp.json().get("workspaces", [])

    def execute_function(self, workspace_id: str, input_data: dict):
        """
        Executes the main function in the specified workspace using POST /run/{workspace_id} with a JSON body.

        Args:
            workspace_id (str): Workspace ID.
            input_data (dict): JSON payload to send.

        Returns:
            dict or str: The response from the run endpoint, as JSON if possible, else raw text.

        Raises:
            httpx.HTTPStatusError: If the request fails.
        """
        url = f"{self.RUN_BASE_URL}/run/{workspace_id}"
        log_event(f"POST {url} with JSON body: {input_data}")
        resp = httpx.post(url, headers=self._headers(), json=input_data, timeout=30)
        log_event(f"Response status: {resp.status_code}, body: {resp.text}")
        resp.raise_for_status()
        try:
            return resp.json()
        except Exception as e:
            log_event(f"Response is not JSON: {e}. Returning raw text.")
            return resp.text


@mcp.tool()
def execute_function(function_id: str, input_data: dict) -> dict:
    """
    Executes the main function in the specified workspace using POST /run/{workspace_id} with a JSON body.

    Args:
        workspace_id (str): Workspace ID.
        input_data (dict): JSON payload to send.

    Returns:
        dict: The response from the run endpoint.

    Raises:
        RuntimeError: If the API token is not configured.
        httpx.HTTPStatusError: If the request fails.
    """
    log_event(
        f"execute_function tool called for function {function_id} with input: {input_data}"
    )
    token = app_config.microfn_api_token

    if not token:
        log_event(
            "MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables."
        )
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )

    client = MicroFnAPIClient(token=token)
    result = client.execute_function(function_id, input_data)
    log_event(f"execute_function result: {result}")
    return result


@mcp.tool()
def ping() -> str:
    """
    Responds with 'pong' to test server connectivity.

    Returns:
        str: The string 'pong'.
    """
    log_event("ping tool called")
    settings_dump = repr(mcp.settings)
    log_event(f"Dumping mcp.settings: {settings_dump}")
    return "pong"


@mcp.tool()
def list_functions() -> list:
    """
    Lists all functions for the authenticated user using the MicroFn API.

    Returns:
        list: List of function objects.
    """
    log_event("list_functions tool called")
    # Use the token directly from our Pydantic app_config
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


if __name__ == "__main__":
    log_event("MCP server starting up")
    mcp.run()


# --- New MCP Tools ---


@mcp.tool()
def create_function(name: str, code: str) -> dict:
    """
    Creates a new function (workspace) with the given name and code.

    IMPORTANT: The code must include an exported main(input: any) function as the entrypoint.


    Example:
        ```
        import kv from "@microfn/kv";

        // An exported main function is your entrypoint! 🚀
        export async function main(input: any) {
          console.log("processing data", input);

          // Example: Fetching data from KV
          // const value = await kv.get("my-key");
          // console.log("KV value:", value);

          return "hello " + JSON.stringify(input);
        }
        ```

    Args:
        name (str): Name for the function/workspace.
        code (str): Initial code for the function. Must include a main(input: any) entrypoint.

    Returns:
        dict: The created workspace object.
    """
    log_event(f"create_function tool called with name: {name}")
    token = app_config.microfn_api_token
    if not token:
        log_event(
            "MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables."
        )
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )
    client = MicroFnAPIClient(token=token)
    result = client.create_workspace_with_code(name, code)
    log_event(f"create_function result: {result}")
    return result


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


@mcp.tool()
def update_function_code(function_id: str, code: str) -> dict:
    """
    Updates the code for a function.

    IMPORTANT: The code must include an exported main(input: any) function as the entrypoint.

    Example:
        ```
        import kv from "@microfn/kv";

        // An exported main function is your entrypoint! 🚀
        export async function main(input: any) {
          console.log("processing data", input);

          // Example: Fetching data from KV
          // const value = await kv.get("my-key");
          // console.log("KV value:", value);

          return "hello " + JSON.stringify(input);
        }
        ```

    Args:
        function_id (str): Function ID.
        code (str): The new code to set. Must include a main(input: any) entrypoint.

    Returns:
        dict: The response from the update endpoint.
    """
    log_event(f"update_function_code tool called for function {function_id}")
    token = app_config.microfn_api_token
    if not token:
        log_event(
            "MICROFN_API_TOKEN not found in app_config (loaded by Pydantic). Check environment variables."
        )
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )
    client = MicroFnAPIClient(token=token)
    result = client.update_workspace_code(function_id, code)
    log_event(f"update_function_code result: {result}")
    return result


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
