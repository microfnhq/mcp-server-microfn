import os
import logging
from pydantic_settings import BaseSettings, SettingsConfigDict
from fastmcp import FastMCP


# --- Logging Setup ---
import sys

LOG_TO_STDOUT = os.environ.get("LOG_TO_STDOUT", "1") == "1"
if LOG_TO_STDOUT:
    logging.basicConfig(
        stream=sys.stdout,
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
    )
else:
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
    model_config: SettingsConfigDict = SettingsConfigDict(
        env_file=None, extra="ignore"
    )  # Do not load .env, ignore extra fields

    microfn_api_token: str | None = None


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

# Initialize FastMCP
mcp_init_kwargs = {}
if app_config.microfn_api_token:
    mcp_init_kwargs["microfn_api_token_if_fastmcp_uses_it"] = (
        app_config.microfn_api_token
    )

mcp = FastMCP("MicroFn MCP Server", **mcp_init_kwargs)
