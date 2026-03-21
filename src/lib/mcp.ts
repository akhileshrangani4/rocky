import { createMCPClient } from "@ai-sdk/mcp";
import { getDb, schema } from "@/db";
import { eq } from "drizzle-orm";

type MCPConnection = {
  client: { tools: () => Promise<Record<string, unknown>>; close: () => Promise<void> };
  serverId: string;
};

let _mcpTools: Record<string, unknown> | null = null;
let _connections: MCPConnection[] = [];

async function getEnabledServers() {
  const db = getDb();
  return db
    .select()
    .from(schema.mcpServer)
    .where(eq(schema.mcpServer.enabled, true));
}

export async function getMCPTools(): Promise<Record<string, unknown>> {
  if (_mcpTools) return _mcpTools;

  const servers = await getEnabledServers();
  if (servers.length === 0) return {};

  const allTools: Record<string, unknown> = {};

  for (const server of servers) {
    try {
      const headers: Record<string, string> = {};

      if (server.authType === "bearer" && server.authToken) {
        headers["Authorization"] = `Bearer ${server.authToken}`;
      } else if (server.authType === "header" && server.headerName && server.authToken) {
        headers[server.headerName] = server.authToken;
      }

      const client = await createMCPClient({
        transport: {
          type: "http",
          url: server.url,
          headers: Object.keys(headers).length > 0 ? headers : undefined,
        },
      });

      _connections.push({ client, serverId: server.id });
      const tools = await client.tools();
      Object.assign(allTools, tools);

      console.log(`[rocky] MCP connected: ${server.name} (${Object.keys(tools).length} tools)`);
    } catch (err) {
      console.error(`[rocky] MCP failed to connect: ${server.name}`, err);
    }
  }

  _mcpTools = allTools;
  return allTools;
}

// Force refresh — call when MCP servers are added/removed
export function invalidateMCPCache() {
  _mcpTools = null;
  _connections.forEach((c) => c.client.close().catch(() => {}));
  _connections = [];
}

export async function closeMCPClients() {
  await Promise.all(_connections.map((c) => c.client.close().catch(() => {})));
  _connections = [];
  _mcpTools = null;
}
