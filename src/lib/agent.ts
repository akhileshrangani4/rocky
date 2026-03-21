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
  onProgress?: (step: string) => Promise<void>;
};

export async function handleAgentRequest(request: AgentRequest) {
  const { message, platform, threadId, taskId, history, platformContext, onProgress } = request;

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

## Platform-aware behavior

Depending on where the message comes from, do the obvious follow-up actions automatically:

### Linear
- You have full context: the issue ID, title, description, and URL from the platform context
- After opening a PR: update the issue status to "In Review", comment on the issue with the PR link
- After completing work: move the issue to "Done" if appropriate
- If asked to create a sub-issue or related task: create it in the same team/project
- If asked to schedule something: create the calendar event AND add a comment on the issue

### GitHub
- You have full context: the repo, issue/PR number, title, body from the platform context
- After opening a fix PR: reference the issue (e.g., "Fixes #123") in the PR body
- After reviewing code: leave a comment with your findings
- If asked about a repo: search it first before asking the user

### Slack
- Keep responses concise — Slack messages should be short and scannable
- Use thread replies, not new messages
- After completing a task: summarize with links (PR URL, issue URL, etc.)
- If asked to schedule a meeting: create it and post the Google Meet link

### Discord
- Similar to Slack — keep responses concise
- Use markdown formatting

### Telegram
- Keep responses short — mobile-friendly
- After completing tasks: send a brief summary with links

## When implementing features or fixing issues
1. Read the conversation context and platform context — don't ask for info you already have
2. Search the relevant repo to understand the codebase
3. Write the code in a sandbox
4. Run tests if applicable
5. Open a PR with the changes
6. Do all follow-up actions for the platform (update issue status, link PR, comment, etc.)

Always be concise. Use markdown. Summarize what you did clearly.
Use your tools — don't say you can't do something if you have the tools to do it.`,
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
      const toolCalls = step.toolCalls?.map((tc) => tc.toolName) ?? [];
      const toolNames = toolCalls.join(", ");

      // Human-readable progress messages
      const progressMap: Record<string, string> = {
        executeCode: "Running code in sandbox...",
        createPullRequest: "Opening pull request...",
        browsePage: "Browsing web page...",
      };

      let statusMsg = "Thinking...";
      if (toolNames) {
        // Use the first recognized tool for the status message
        for (const name of toolCalls) {
          if (progressMap[name]) {
            statusMsg = progressMap[name];
            break;
          }
        }
        // Fallback for Composio tools
        if (statusMsg === "Thinking...") {
          if (toolNames.toLowerCase().includes("github")) statusMsg = "Working with GitHub...";
          else if (toolNames.toLowerCase().includes("linear")) statusMsg = "Updating Linear...";
          else if (toolNames.toLowerCase().includes("calendar")) statusMsg = "Managing calendar...";
          else if (toolNames.toLowerCase().includes("slack")) statusMsg = "Sending on Slack...";
          else if (toolNames.toLowerCase().includes("gmail")) statusMsg = "Handling email...";
          else statusMsg = `Using ${toolNames}...`;
        }
      }

      if (onProgress && toolNames) {
        await onProgress(statusMsg);
      }

      if (taskId) {
        const logMsg = toolNames
          ? `Step completed - tools used: ${toolNames}`
          : "Step completed - text generated";
        await addTaskLog(taskId, "info", logMsg);
      }
    },
  });

  return result;
}
