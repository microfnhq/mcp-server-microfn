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
    BASE_URL = "http://localhost:3000/api"

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


# --- MCP Tools ---


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
def list_workspaces() -> list:
    """
    Lists all workspaces for the authenticated user using the MicroFn API.

    Returns:
        list: List of workspace objects.
    """
    log_event("list_workspaces tool called")
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
    log_event(f"list_workspaces result: {workspaces}")
    return workspaces


if __name__ == "__main__":
    log_event("MCP server starting up")
    mcp.run()
