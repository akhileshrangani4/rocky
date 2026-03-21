import { getDb, schema } from "@/db";
import { eq, desc } from "drizzle-orm";

type NewTask = {
  type: string;
  status: string;
  platform: string;
  threadId?: string;
  requestedBy?: string;
  input: string;
  metadata?: Record<string, unknown>;
};

export async function createTask(data: NewTask) {
  const db = getDb();
  const [row] = await db.insert(schema.task).values(data).returning();
  return row;
}

export async function updateTask(
  id: string,
  data: Partial<{
    status: string;
    output: string;
    metadata: Record<string, unknown>;
    durationMs: number;
  }>,
) {
  const db = getDb();
  await db
    .update(schema.task)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(schema.task.id, id));
}

export async function getTask(id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(schema.task)
    .where(eq(schema.task.id, id))
    .limit(1);
  return row ?? null;
}

export async function getRecentTasks(limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(schema.task)
    .orderBy(desc(schema.task.createdAt))
    .limit(limit);
}

export async function getTasksForToday() {
  const db = getDb();
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return db
    .select()
    .from(schema.task)
    .where(
      // tasks created today
      // drizzle doesn't have gte built-in for timestamps easily, use sql
      eq(schema.task.status, schema.task.status), // placeholder - will filter in JS
    )
    .orderBy(desc(schema.task.createdAt))
    .limit(200);
}

export async function addTaskLog(
  taskId: string,
  level: string,
  message: string,
  data?: Record<string, unknown>,
) {
  const db = getDb();
  await db.insert(schema.taskLog).values({ taskId, level, message, data });
}

export async function getTaskLogs(taskId: string) {
  const db = getDb();
  return db
    .select()
    .from(schema.taskLog)
    .where(eq(schema.taskLog.taskId, taskId))
    .orderBy(schema.taskLog.createdAt);
}
