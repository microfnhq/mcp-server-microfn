from config import mcp, app_config, log_event
import tools.execute_function
import tools.ping
import tools.list_functions
import tools.create_function
import tools.get_function_code
import tools.update_function_code
import tools.check_deployment

# --- MicroFn API Client (Reusable) ---


# MicroFnAPIClient is now in api_client.py


if __name__ == "__main__":
    log_event("MCP server starting up")
    mcp.run()
