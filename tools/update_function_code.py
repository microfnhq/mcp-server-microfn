from config import mcp, app_config, log_event
from api_client import MicroFnAPIClient


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
