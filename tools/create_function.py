from config import mcp, app_config, log_event
from api_client import MicroFnAPIClient


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
