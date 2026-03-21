// Dashboard event system using Upstash Redis for cross-instance communication

import { getRedis } from "@/lib/redis";

export type DashboardEvent = {
  type: "task_created" | "task_completed" | "task_failed" | "task_log";
  task?: Record<string, unknown>;
  taskId?: string;
  log?: { level: string; message: string };
};

const CHANNEL = "rocky:dashboard:events";

export async function pushEvent(event: DashboardEvent) {
  try {
    const redis = getRedis();
    await redis.lpush(CHANNEL, JSON.stringify({ ...event, timestamp: Date.now() }));
    // Keep only last 200 events
    await redis.ltrim(CHANNEL, 0, 199);
  } catch {
    // Silently fail — dashboard events are non-critical
  }
}

export async function getRecentEvents(limit = 50): Promise<(DashboardEvent & { timestamp: number })[]> {
  try {
    const redis = getRedis();
    const raw = await redis.lrange<string>(CHANNEL, 0, limit - 1);
    return raw.map((r) => (typeof r === "string" ? JSON.parse(r) : r));
  } catch {
    return [];
  }
}
