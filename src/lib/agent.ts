import { ToolLoopAgent, tool, stepCountIs } from "ai";
import { z } from "zod";
import { Composio } from "@composio/core";
import { VercelProvider } from "@composio/vercel";
import { executeCode } from "@/lib/tools/code-exec";
import { browsePage } from "@/lib/tools/browser";
import { getMCPTools } from "@/lib/mcp";
import { addTaskLog } from "@/lib/tasks";

const MODEL = "openai/gpt-5.4" as const;

// ── Composio setup ──────────────────────────────────────────────────────────

let _composioTools: Record<string, unknown> | null = null;

async function getComposioTools(): Promise<Record<string, unknown>> {
  if (_composioTools) return _composioTools;
  if (!process.env.COMPOSIO_API_KEY) return {};

  try {
    const composio = new Composio({ provider: new VercelProvider() });
    const session = await composio.create("rocky-agent");
    const tools = await session.tools();
    _composioTools = tools as Record<string, unknown>;
    console.log(`[rocky] Composio loaded ${Object.keys(tools).length} tools`);
    return _composioTools;
  } catch (err) {
    console.error("[rocky] Composio failed to load:", err);
    return {};
  }
}

// ── Built-in tools (only what Composio doesn't cover) ───────────────────────

const builtInTools = {
  executeCode: tool({
    description:
      "Execute code in a secure Vercel Sandbox. Use for running scripts, testing code, or building features. The sandbox has Node.js, git, and can install packages.",
    inputSchema: z.object({
      files: z
        .array(
          z.object({
            path: z.string(),
            content: z.string(),
          }),
        )
        .describe("Files to write to the sandbox"),
      commands: z
        .array(z.string())
        .describe("Shell commands to run in order"),
      repo: z
        .string()
        .optional()
        .describe("Repository to clone first (owner/repo)"),
      branch: z
        .string()
        .optional()
        .describe("Branch name for new changes"),
    }),
    execute: async (input) => executeCode(input),
  }),

  createPullRequest: tool({
    description:
      "Create a pull request on GitHub. Use after pushing a branch with changes.",
    inputSchema: z.object({
      repo: z.string().describe("Repository full name, e.g. owner/repo"),
      branch: z.string().describe("Branch name with changes"),
      title: z.string().describe("PR title"),
      body: z.string().describe("PR description in markdown"),
      baseBranch: z.string().default("main").describe("Base branch to merge into"),
    }),
    execute: async (input) => {
      const token = process.env.GITHUB_TOKEN;
      if (!token) return { success: false, error: "GITHUB_TOKEN not set" };

      const res = await fetch(
        `https://api.github.com/repos/${input.repo}/pulls`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github.v3+json",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            title: input.title,
            body: input.body,
            head: input.branch,
            base: input.baseBranch,
          }),
        },
      );

      if (!res.ok) {
        const error = await res.text();
        return { success: false, error: `PR creation failed: ${error}` };
      }

      const pr = await res.json();
      return {
        success: true,
        prNumber: pr.number,
        url: pr.html_url,
        summary: `Opened PR #${pr.number}: ${pr.title}`,
      };
    },
  }),

  browsePage: tool({
    description:
      "Browse a web page to extract information. Use for reading URLs shared in conversations, checking documentation, or verifying deployments.",
    inputSchema: z.object({
      url: z.string().describe("URL to browse"),
      instruction: z
        .string()
        .describe("What information to extract from the page"),
    }),
    execute: async (input) => browsePage(input),
  }),
};

// ── Agent request handler ───────────────────────────────────────────────────

export type AgentRequest = {
  message: string;
  platform: string;
  threadId: string;
  taskId?: string;
  history?: Array<{ role: string; content: string | Array<{ type: string; text?: string }> }>;
  platformContext?: string;
};

export async function handleAgentRequest(request: AgentRequest) {
  const { message, platform, threadId, taskId, history, platformContext } = request;

  // Load external tools (cached after first call)
  const [mcpTools, composioTools] = await Promise.all([
    getMCPTools(),
    getComposioTools(),
  ]);

  // Merge all tools: built-in + MCP + Composio
  const allTools = {
    ...builtInTools,
    ...mcpTools,
    ...composioTools,
  } as typeof builtInTools;

  const externalToolCount = Object.keys(mcpTools).length + Object.keys(composioTools).length;

  const agent = new ToolLoopAgent({
    model: MODEL,
    instructions: `You are Rocky, a personal AI ops agent. You help your user across Slack, Discord, GitHub, Linear, and Telegram.

You have access to tools for GitHub, Linear, Google Calendar, Slack, Gmail, and more via Composio. You also have:
- Code execution in secure Vercel Sandboxes
- Web browsing for context
- Creating pull requests on GitHub
${externalToolCount > 0 ? `- ${externalToolCount} tools from connected services` : ""}

When implementing features or fixing issues:
1. First understand what the user wants by reading the conversation context and platform context
2. Search the relevant repo to understand the codebase
3. Write the code in a sandbox
4. Run tests if applicable
5. Open a PR with the changes
6. IMPORTANT: After opening a PR, always do these follow-up actions:
   - If the request came from a Linear issue: update the issue status to "In Progress" or "In Review", and add a comment with the PR link
   - If the request came from a GitHub issue: add a comment linking the PR
   - Always attach/link the PR to the relevant issue

When updating Linear issues:
- Use the Linear tools to change issue status (e.g., move to "In Review" after opening a PR)
- Add a comment on the issue with the PR link and a brief summary of changes
- If you know the issue ID from the platform context, use it directly

Always be concise in chat responses. Use markdown formatting.
When you complete a task, summarize what you did clearly.
If a user asks you to do something and you have a tool for it, use the tool. Don't ask for information you already have from the platform context.`,
    tools: allTools,
    stopWhen: stepCountIs(15),
  });

  // Build messages array with conversation history
  const messages: Array<{ role: "user" | "assistant" | "system"; content: string }> = [];

  const systemContent = [
    `[Platform: ${platform}] [Thread: ${threadId}]`,
    platformContext ? `\n--- Platform Context ---\n${platformContext}` : "",
  ].join("");

  messages.push({
    role: "system" as const,
    content: systemContent,
  });

  if (history?.length) {
    for (const msg of history) {
      const role = msg.role === "assistant" ? "assistant" as const : "user" as const;
      const content = typeof msg.content === "string"
        ? msg.content
        : msg.content.map((p) => p.text ?? "").join("");
      if (content.trim()) {
        messages.push({ role, content });
      }
    }
  }

  messages.push({ role: "user" as const, content: message });

  const result = await agent.stream({
    messages,
    onStepFinish: async (step) => {
      if (taskId) {
        const toolCalls = step.toolCalls?.map((tc) => tc.toolName).join(", ");
        const logMsg = toolCalls
          ? `Step completed - tools used: ${toolCalls}`
          : "Step completed - text generated";
        await addTaskLog(taskId, "info", logMsg);
      }
    },
  });

  return result;
}
