import { Chat } from "chat";
import { createSlackAdapter } from "@chat-adapter/slack";
import { createDiscordAdapter } from "@chat-adapter/discord";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createGitHubAdapter } from "@chat-adapter/github";
import { createLinearAdapter } from "@chat-adapter/linear";
import { createRedisState } from "@chat-adapter/state-redis";
import { toAiMessages } from "chat";
import { isUserAllowed, type Platform } from "@/lib/allowed-users";
import { handleAgentRequest } from "@/lib/agent";
import { createTask, addTaskLog, updateTask } from "@/lib/tasks";
import { pushEvent } from "@/lib/events";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _bot: any;

function getPlatformFromThread(thread: { id: string }): Platform {
  const id = thread.id;
  if (id.startsWith("slack:")) return "slack";
  if (id.startsWith("discord:")) return "discord";
  if (id.startsWith("telegram:")) return "telegram";
  if (id.startsWith("github:")) return "github";
  if (id.startsWith("linear:")) return "linear";
  return "slack";
}

async function getThreadHistory(thread: any) {
  try {
    await thread.refresh();
    const recentMessages = thread.recentMessages ?? [];
    return await toAiMessages(recentMessages);
  } catch {
    // Some platforms (Telegram) don't support fetching history
    return [];
  }
}

function extractPlatformContext(platform: Platform, message: any, thread: any): string {
  const parts: string[] = [];

  if (platform === "linear") {
    const raw = message.raw;
    if (raw?.comment) {
      if (raw.comment.issueId) parts.push(`Linear Issue ID: ${raw.comment.issueId}`);
      if (raw.comment.body) parts.push(`Comment: ${raw.comment.body}`);
    }
    // Thread ID encodes the issue ID
    if (thread.id) parts.push(`Thread: ${thread.id}`);
    // Try to get issue URL from the webhook payload
    if (raw?.url) parts.push(`URL: ${raw.url}`);
  }

  if (platform === "github") {
    const raw = message.raw;
    if (raw?.issue) {
      parts.push(`GitHub Issue #${raw.issue.number}: ${raw.issue.title}`);
      if (raw.issue.body) parts.push(`Issue body: ${raw.issue.body.slice(0, 1000)}`);
      if (raw.issue.html_url) parts.push(`URL: ${raw.issue.html_url}`);
    }
    if (raw?.pull_request) {
      parts.push(`GitHub PR #${raw.pull_request.number}: ${raw.pull_request.title}`);
      if (raw.pull_request.body) parts.push(`PR body: ${raw.pull_request.body.slice(0, 1000)}`);
      if (raw.pull_request.html_url) parts.push(`URL: ${raw.pull_request.html_url}`);
    }
    if (raw?.repository) {
      parts.push(`Repo: ${raw.repository.full_name}`);
    }
  }

  if (platform === "slack") {
    // Slack channel context
    if (thread.channelId) parts.push(`Channel: ${thread.channelId}`);
  }

  return parts.join("\n");
}

// Shared handler for processing messages from any platform
async function handleMessage(thread: any, message: any, isFollowUp = false) {
  const platform = getPlatformFromThread(thread);
  const senderId = String(
    message.author?.userId ?? message.raw?.from?.id ?? message.raw?.user ?? message.id,
  );

  console.log("[rocky] handleMessage", {
    platform,
    senderId,
    threadId: thread.id,
    isFollowUp,
    text: message.text?.slice(0, 50),
  });

  const allowed = await isUserAllowed(platform, senderId);
  if (!allowed) {
    console.log("[rocky] unauthorized", { platform, senderId });
    try {
      await thread.postEphemeral(senderId, "You're not authorized to use Rocky.");
    } catch {
      await thread.post("You're not authorized to use Rocky.");
    }
    return;
  }

  if (!isFollowUp) {
    await thread.subscribe();
  }
  await thread.startTyping();

  const history = await getThreadHistory(thread);
  const platformContext = extractPlatformContext(platform, message, thread);

  // Acknowledge immediately so the user knows Rocky is working
  let statusMsg = await thread.post("On it...");
  let lastStatus = "On it...";

  const taskRecord = !isFollowUp
    ? await createTask({
        type: "general",
        status: "running",
        platform,
        threadId: thread.id,
        requestedBy: senderId,
        input: message.text,
      })
    : null;

  if (taskRecord) {
    await addTaskLog(taskRecord.id, "info", `Request from ${platform}: ${message.text}`);
    await pushEvent({ type: "task_created", task: taskRecord as unknown as Record<string, unknown> });
  }

  // Progress callback — updates status and posts step trail
  const onProgress = async (stepInfo: string) => {
    console.log("[rocky] step", { platform, threadId: thread.id, step: stepInfo });

    if (taskRecord) {
      await addTaskLog(taskRecord.id, "info", stepInfo);
      await pushEvent({ type: "task_log", taskId: taskRecord.id, log: { level: "info", message: stepInfo } });
    }

    // Skip duplicate status
    if (stepInfo === lastStatus) return;
    lastStatus = stepInfo;

    // Try to edit the status message; if edit fails, post a new one
    try {
      await statusMsg.edit(stepInfo);
    } catch {
      // Edit not supported or failed — post new message as update trail
      statusMsg = await thread.post(stepInfo);
    }
  };

  try {
    const startTime = Date.now();
    const result = await handleAgentRequest({
      message: message.text,
      platform,
      threadId: thread.id,
      taskId: taskRecord?.id,
      history,
      platformContext,
      onProgress,
    });

    // Update status to show we're finalizing
    try {
      await statusMsg.edit("Wrapping up...");
    } catch { /* ignore */ }

    // Post the actual response — try to edit status, fall back to new message
    try { await statusMsg.delete(); } catch { /* ignore */ }
    await thread.post(result.textStream);

    if (taskRecord) {
      const durationMs = Date.now() - startTime;
      const output = typeof result === "string" ? result : "Streamed response";
      await updateTask(taskRecord.id, {
        status: "completed",
        output,
        durationMs,
      });
      await pushEvent({ type: "task_completed", taskId: taskRecord.id });
      console.log("[rocky] completed", { taskId: taskRecord.id, durationMs, platform });
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error("[rocky] error", { platform, threadId: thread.id, error: errorMessage });

    try {
      await statusMsg.edit(`Something went wrong: ${errorMessage}`);
    } catch {
      await thread.post(`Something went wrong: ${errorMessage}`);
    }

    if (taskRecord) {
      await addTaskLog(taskRecord.id, "error", errorMessage);
      await updateTask(taskRecord.id, { status: "failed", output: errorMessage });
      await pushEvent({ type: "task_failed", taskId: taskRecord.id });
    }
  }
}

export function getBot() {
  if (_bot) return _bot;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const adapters: Record<string, any> = {};

  // ── Slack ────────────────────────────────────────────────────────────────
  if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_SIGNING_SECRET) {
    adapters.slack = createSlackAdapter({
      signingSecret: process.env.SLACK_SIGNING_SECRET,
      botToken: process.env.SLACK_BOT_TOKEN,
    });
  }

  // ── Discord ──────────────────────────────────────────────────────────────
  if (
    process.env.DISCORD_BOT_TOKEN &&
    process.env.DISCORD_PUBLIC_KEY &&
    process.env.DISCORD_APPLICATION_ID
  ) {
    adapters.discord = createDiscordAdapter({
      publicKey: process.env.DISCORD_PUBLIC_KEY,
      botToken: process.env.DISCORD_BOT_TOKEN,
      applicationId: process.env.DISCORD_APPLICATION_ID,
    });
  }

  // ── Telegram ─────────────────────────────────────────────────────────────
  if (process.env.TELEGRAM_BOT_TOKEN) {
    adapters.telegram = createTelegramAdapter({
      botToken: process.env.TELEGRAM_BOT_TOKEN,
    });
  }

  // ── GitHub ───────────────────────────────────────────────────────────────
  if (process.env.GITHUB_TOKEN && process.env.GITHUB_WEBHOOK_SECRET) {
    adapters.github = createGitHubAdapter({
      botUserId: Number(process.env.GITHUB_BOT_USER_ID),
      webhookSecret: process.env.GITHUB_WEBHOOK_SECRET,
    });
  }

  // ── Linear ───────────────────────────────────────────────────────────────
  if (process.env.LINEAR_ACCESS_TOKEN && process.env.LINEAR_WEBHOOK_SECRET) {
    adapters.linear = createLinearAdapter({
      apiKey: process.env.LINEAR_ACCESS_TOKEN,
      webhookSecret: process.env.LINEAR_WEBHOOK_SECRET,
    });
  }

  _bot = new Chat({
    userName: "rocky",
    adapters,
    state: createRedisState(),
    streamingUpdateIntervalMs: 1000,
    dedupeTtlMs: 10_000,
    fallbackStreamingPlaceholderText: "Thinking...",
  });

  // ── @mention or DM (DMs auto-set isMention=true, fall through here) ────
  _bot.onNewMention(async (thread: any, message: any) => {
    await handleMessage(thread, message, false);
  });

  // ── Linear/GitHub comments (these adapters don't set isMention) ────────
  // Catch all new messages that mention "rocky" in the text body
  _bot.onNewMessage(/rocky/i, async (thread: any, message: any) => {
    await handleMessage(thread, message, false);
  });

  // ── Follow-up messages in subscribed threads ───────────────────────────
  _bot.onSubscribedMessage(async (thread: any, message: any) => {
    await handleMessage(thread, message, true);
  });

  return _bot;
}
