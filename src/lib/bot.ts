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
      secretToken: process.env.TELEGRAM_WEBHOOK_SECRET,
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

  // ── Main handler: user @mentions Rocky ─────────────────────────────────

  _bot.onNewMention(async (thread: any, message: any) => {
    const platform = getPlatformFromThread(thread);
    const senderId = message.author?.userId ?? message.raw?.user ?? message.id;

    const allowed = await isUserAllowed(platform, String(senderId));
    if (!allowed) {
      try {
        await thread.postEphemeral(senderId, "You're not authorized to use Rocky.");
      } catch {
        await thread.post("You're not authorized to use Rocky.");
      }
      return;
    }

    await thread.subscribe();
    await thread.startTyping();

    // Fetch conversation history for context
    await thread.refresh();
    const recentMessages = thread.recentMessages ?? [];
    const history = await toAiMessages(recentMessages);

    const taskRecord = await createTask({
      type: "general",
      status: "running",
      platform,
      threadId: thread.id,
      requestedBy: senderId,
      input: message.text,
    });

    await addTaskLog(taskRecord.id, "info", `Request from ${platform}: ${message.text}`);
    pushEvent({ type: "task_created", task: taskRecord as unknown as Record<string, unknown> });

    try {
      const startTime = Date.now();
      const result = await handleAgentRequest({
        message: message.text,
        platform,
        threadId: thread.id,
        taskId: taskRecord.id,
        history,
      });

      if (typeof result === "string") {
        await thread.post(result);
      } else {
        await thread.post(result.textStream);
      }

      const durationMs = Date.now() - startTime;
      const output = typeof result === "string" ? result : "Streamed response";
      await updateTask(taskRecord.id, {
        status: "completed",
        output,
        durationMs,
      });
      pushEvent({ type: "task_completed", taskId: taskRecord.id });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await addTaskLog(taskRecord.id, "error", errorMessage);
      await updateTask(taskRecord.id, { status: "failed", output: errorMessage });
      await thread.post(`Something went wrong: ${errorMessage}`);
      pushEvent({ type: "task_failed", taskId: taskRecord.id });
    }
  });

  // ── Follow-up messages in subscribed threads ───────────────────────────

  _bot.onSubscribedMessage(async (thread: any, message: any) => {
    const platform = getPlatformFromThread(thread);
    const senderId = message.author?.userId ?? message.raw?.user ?? message.id;

    const allowed = await isUserAllowed(platform, senderId);
    if (!allowed) return;

    await thread.startTyping();

    // Fetch conversation history for context
    await thread.refresh();
    const recentMessages = thread.recentMessages ?? [];
    const history = await toAiMessages(recentMessages);

    try {
      const result = await handleAgentRequest({
        message: message.text,
        platform,
        threadId: thread.id,
        history,
      });

      if (typeof result === "string") {
        await thread.post(result);
      } else {
        await thread.post(result.textStream);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      await thread.post(`Something went wrong: ${errorMessage}`);
    }
  });

  return _bot;
}
