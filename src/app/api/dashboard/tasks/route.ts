import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getRecentTasks, getTask, getTaskLogs } from "@/lib/tasks";

export async function GET(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const taskId = url.searchParams.get("id");

  if (taskId) {
    const [task, logs] = await Promise.all([
      getTask(taskId),
      getTaskLogs(taskId),
    ]);
    if (!task) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ task, logs });
  }

  const limit = parseInt(url.searchParams.get("limit") || "50");
  const tasks = await getRecentTasks(limit);
  return NextResponse.json({ tasks });
}
