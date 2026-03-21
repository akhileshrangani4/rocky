import { ToolLoopAgent, tool, stepCountIs } from "ai";
import { z } from "zod";
import { scheduleMeeting } from "@/lib/tools/calendar";
import { createLinearIssue } from "@/lib/tools/linear";
import { createPullRequest, searchRepo } from "@/lib/tools/github";
import { executeCode } from "@/lib/tools/code-exec";
import { browsePage } from "@/lib/tools/browser";
import { addTaskLog } from "@/lib/tasks";

const MODEL = "openai/gpt-5.4" as const;

const rockyAgent = new ToolLoopAgent({
  model: MODEL,
  instructions: `You are Rocky, a personal AI ops agent. You help your user across Slack, Discord, GitHub, Linear, and Telegram.

You can:
- Schedule meetings on Google Calendar
- Create Linear issues
- Search and understand code repositories
- Write code and open pull requests
- Browse web pages for context
- Execute code in sandboxes

When implementing features:
1. First understand what the user wants by reading the conversation context
2. Search the relevant repo to understand the codebase
3. Write the code in a sandbox
4. Run tests if applicable
5. Open a PR with the changes

Always be concise in chat responses. Use markdown formatting.
When you complete a task, summarize what you did clearly.`,
  tools: {
    scheduleMeeting: tool({
      description:
        "Schedule a meeting on Google Calendar with a Google Meet link. Use when the user asks to schedule a meeting, call, or sync.",
      inputSchema: z.object({
        title: z.string().describe("Meeting title"),
        attendees: z
          .array(z.string())
          .describe("Email addresses of attendees"),
        startTime: z
          .string()
          .describe("ISO 8601 start time, e.g. 2026-03-22T14:00:00-05:00"),
        durationMinutes: z
          .number()
          .default(30)
          .describe("Duration in minutes"),
        description: z.string().optional().describe("Meeting description"),
      }),
      execute: async (input) => scheduleMeeting(input),
    }),

    createLinearIssue: tool({
      description:
        "Create an issue in Linear. Use when the user asks to create a ticket, issue, or task in Linear.",
      inputSchema: z.object({
        title: z.string().describe("Issue title"),
        description: z.string().optional().describe("Issue description in markdown"),
        teamId: z.string().optional().describe("Linear team ID, if known"),
        priority: z
          .number()
          .min(0)
          .max(4)
          .optional()
          .describe("Priority: 0=none, 1=urgent, 2=high, 3=medium, 4=low"),
        labels: z
          .array(z.string())
          .optional()
          .describe("Label names to apply"),
      }),
      execute: async (input) => createLinearIssue(input),
    }),

    searchRepo: tool({
      description:
        "Search a GitHub repository for files, code patterns, or understand the codebase structure. Use before implementing features.",
      inputSchema: z.object({
        repo: z
          .string()
          .describe("Repository full name, e.g. owner/repo"),
        query: z
          .string()
          .describe("Search query - file path, function name, or pattern"),
        type: z
          .enum(["code", "files", "readme"])
          .default("code")
          .describe("Type of search"),
      }),
      execute: async (input) => searchRepo(input),
    }),

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
        "Create a pull request on GitHub after making changes in a sandbox.",
      inputSchema: z.object({
        repo: z.string().describe("Repository full name, e.g. owner/repo"),
        branch: z.string().describe("Branch name with changes"),
        title: z.string().describe("PR title"),
        body: z.string().describe("PR description in markdown"),
        baseBranch: z.string().default("main").describe("Base branch"),
      }),
      execute: async (input) => createPullRequest(input),
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
  },
  stopWhen: stepCountIs(15),
});

export type AgentRequest = {
  message: string;
  platform: string;
  threadId: string;
  taskId?: string;
};

export async function handleAgentRequest(request: AgentRequest) {
  const { message, platform, threadId, taskId } = request;

  const contextPrompt = `[Platform: ${platform}] [Thread: ${threadId}]\n\nUser message: ${message}`;

  // Use streaming for responsiveness
  const result = await rockyAgent.stream({
    prompt: contextPrompt,
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
