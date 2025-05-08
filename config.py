import os
import logging
from pydantic_settings import BaseSettings, SettingsConfigDict
from fastmcp import FastMCP


# --- Logging Setup ---


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
except Exception as e:
    app_config = AppSettings(microfn_api_token=None)  # Ensure app_config exists

# Initialize FastMCP
mcp_init_kwargs = {}
if app_config.microfn_api_token:
    mcp_init_kwargs["microfn_api_token_if_fastmcp_uses_it"] = (
        app_config.microfn_api_token
    )

mcp = FastMCP("MicroFn MCP Server", **mcp_init_kwargs)
