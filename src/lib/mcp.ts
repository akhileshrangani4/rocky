import { createMCPClient } from "@ai-sdk/mcp";

type MCPServerConfig = {
  name: string;
  url: string;
  headers?: Record<string, string>;
};

// MCP servers Rocky can connect to — configure via env vars
function getMCPServers(): MCPServerConfig[] {
  const servers: MCPServerConfig[] = [];

  // GitHub MCP — repos, PRs, issues, code search
  if (process.env.GITHUB_MCP_URL) {
    servers.push({
      name: "github",
      url: process.env.GITHUB_MCP_URL,
      headers: process.env.GITHUB_TOKEN
        ? { Authorization: `Bearer ${process.env.GITHUB_TOKEN}` }
        : undefined,
    });
  }

  // Linear MCP — issues, projects, teams
  if (process.env.LINEAR_MCP_URL) {
    servers.push({
      name: "linear",
      url: process.env.LINEAR_MCP_URL,
      headers: process.env.LINEAR_ACCESS_TOKEN
        ? { Authorization: process.env.LINEAR_ACCESS_TOKEN }
        : undefined,
    });
  }

  // Vercel MCP — projects, deployments, logs
  if (process.env.VERCEL_MCP_URL) {
    servers.push({
      name: "vercel",
      url: process.env.VERCEL_MCP_URL,
    });
  }

  // Custom MCP servers
  // Format: CUSTOM_MCP_1_URL, CUSTOM_MCP_1_NAME, CUSTOM_MCP_1_TOKEN
  for (let i = 1; i <= 5; i++) {
    const url = process.env[`CUSTOM_MCP_${i}_URL`];
    const name = process.env[`CUSTOM_MCP_${i}_NAME`] ?? `custom-${i}`;
    const token = process.env[`CUSTOM_MCP_${i}_TOKEN`];
    if (url) {
      servers.push({
        name,
        url,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    }
  }

  return servers;
}

// Cache MCP clients to avoid reconnecting on every request
let _mcpTools: Record<string, unknown> | null = null;
let _mcpClients: Array<{ close: () => Promise<void> }> = [];

export async function getMCPTools(): Promise<Record<string, unknown>> {
  if (_mcpTools) return _mcpTools;

  const servers = getMCPServers();
  if (servers.length === 0) return {};

  const allTools: Record<string, unknown> = {};

  for (const server of servers) {
    try {
      const client = await createMCPClient({
        transport: {
          type: "http",
          url: server.url,
          headers: server.headers,
        },
      });

      _mcpClients.push(client);
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

// Cleanup — call on shutdown if needed
export async function closeMCPClients() {
  await Promise.all(_mcpClients.map((c) => c.close().catch(() => {})));
  _mcpClients = [];
  _mcpTools = null;
}
