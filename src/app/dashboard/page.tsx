import { getRecentTasks } from "@/lib/tasks";
import { TaskOverview } from "@/components/dashboard/task-overview";

export default async function DashboardPage() {
  const tasks = await getRecentTasks(100);

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayTasks = tasks.filter((t) => t.createdAt >= todayStart);

  const stats = {
    total: todayTasks.length,
    completed: todayTasks.filter((t) => t.status === "completed").length,
    running: todayTasks.filter((t) => t.status === "running").length,
    failed: todayTasks.filter((t) => t.status === "failed").length,
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Today&apos;s overview of Rocky&apos;s activity across all platforms.
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
      <TaskOverview tasks={todayTasks} />
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
