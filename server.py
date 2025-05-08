from config import mcp, app_config
import tools.execute_function
import tools.ping
import tools.list_functions
import tools.create_function
import tools.get_function_code
import tools.update_function_code
import tools.check_deployment
import tools.secret
import tools.rename_function
import tools.package_management

# --- MicroFn API Client (Reusable) ---


# MicroFnAPIClient is now in api_client.py


def main():
    mcp.run(transport="stdio")


if __name__ == "__main__":
    main()
