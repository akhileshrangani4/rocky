import { getRecentTasks } from "@/lib/tasks";
import { TaskOverview } from "@/components/dashboard/task-overview";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const tasks = await getRecentTasks(100);

  // Show all tasks from the last 24 hours (timezone-safe)
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentTasks = tasks.filter((t) => t.createdAt >= cutoff);

  const stats = {
    total: recentTasks.length,
    completed: recentTasks.filter((t) => t.status === "completed").length,
    running: recentTasks.filter((t) => t.status === "running").length,
    failed: recentTasks.filter((t) => t.status === "failed").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Rocky&apos;s activity in the last 24 hours.
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard label="Total Tasks" value={stats.total} />
        <StatCard label="Completed" value={stats.completed} />
        <StatCard label="Running" value={stats.running} />
        <StatCard label="Failed" value={stats.failed} />
      </div>

      {/* Recent tasks */}
      <TaskOverview tasks={recentTasks} />
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-3xl font-bold font-mono tabular-nums">{value}</p>
    </div>
  );
}
