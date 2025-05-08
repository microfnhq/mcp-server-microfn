from config import mcp, app_config
from api_client import MicroFnAPIClient


@mcp.tool()
async def update_function_code(function_id: str, code: str, ctx) -> dict:
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

    Advanced Example (cross-function invocation):
        ```
        import fn from "@microfn/fn";
        export default async function main(input) {
          // Replace with the actual function ID you want to call
          const targetFunctionId = "e6a08dec-2206-46fa-bbe0-d760124b57ab";
          // Call another function and add 10 to its result
          const result = await fn.executeFunction(targetFunctionId, input);
          return result + 10;
        }
        ```

    Args:
        function_id (str): Function ID.
        code (str): The new code to set. Must include a main(input: any) entrypoint.

    Returns:
        dict: The response from the update endpoint.
    """
    await ctx.info(f"Updating code for function {function_id}")
    token = app_config.microfn_api_token
    if not token:
        await ctx.error("MICROFN_API_TOKEN not found in app_config. Check environment variables.")
        raise RuntimeError(
            "MICROFN_API_TOKEN is not configured. Ensure it's set in the environment where the MCP client runs the server."
        )
    client = MicroFnAPIClient(token=token)
    result = client.update_workspace_code(function_id, code)
    await ctx.info("Function code updated successfully")
    await ctx.debug(f"Update result: {result}")
    return result
