import { Router } from "itty-router";

// Tool type definition
type Tool = {
  name: string;
  description: string;
  handler: (args: any) => Promise<any>;
};

// Example tool registry
const tools: Tool[] = [
  {
    name: "hello_world",
    description: "Returns a greeting.",
    handler: async (_args) => {
      return { message: "Hello from Cloudflare Workers MCP server!" };
    },
  },
];

// Utility to list tools (name & description)
function listTools() {
  return tools.map(({ name, description }) => ({ name, description }));
}

// Find a tool by name
function getTool(name: string): Tool | undefined {
  return tools.find((t) => t.name === name);
}

// Router setup
const router = Router();

// List all tools
router.get("/tools", () => {
  return new Response(JSON.stringify(listTools()), {
    headers: { "Content-Type": "application/json" },
  });
});

// Invoke a tool by name (POST /tool/:name)
router.post("/tool/:name", async (request, env, ctx) => {
  const { name } = request.params;
  const tool = getTool(name);
  if (!tool) {
    return new Response(JSON.stringify({ error: "Tool not found" }), {
      status: 404,
      headers: { "Content-Type": "application/json" },
    });
  }
  let args = {};
  try {
    args = await request.json();
  } catch {
    // Ignore if no JSON body
  }
  const result = await tool.handler(args);
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
});

// Root endpoint
router.get("/", () => {
  return new Response("MCP server is running.", { status: 200 });
});

// 404 fallback
router.all("*", () => new Response("Not found", { status: 404 }));

export default {
  fetch: (request: Request, env: any, ctx: any) => router.handle(request, env, ctx),
};