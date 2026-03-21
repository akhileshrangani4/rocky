import { notFound } from "next/navigation";
import { getTask, getTaskLogs } from "@/lib/tasks";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export default async function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [task, logs] = await Promise.all([getTask(id), getTaskLogs(id)]);

  if (!task) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold tracking-tight">Task Detail</h1>
        <Badge
          variant={
            task.status === "completed"
              ? "default"
              : task.status === "failed"
                ? "destructive"
                : "secondary"
          }
        >
          {task.status}
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Input
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">{task.input}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Output
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm whitespace-pre-wrap">
              {task.output ?? "No output yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-muted-foreground">Platform</p>
          <p className="font-medium">{task.platform}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Type</p>
          <p className="font-medium">{task.type}</p>
        </div>
        <div>
          <p className="text-muted-foreground">Duration</p>
          <p className="font-mono tabular-nums">
            {task.durationMs ? `${(task.durationMs / 1000).toFixed(1)}s` : "—"}
          </p>
        </div>
        <div>
          <p className="text-muted-foreground">Created</p>
          <p className="font-mono tabular-nums">
            {task.createdAt.toLocaleString()}
          </p>
        </div>
      </div>

      {task.metadata && (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Metadata
              </CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-xs font-mono bg-muted rounded p-3 overflow-auto">
                {JSON.stringify(task.metadata, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </>
      )}

      <Separator />

      <div>
        <h2 className="text-lg font-semibold mb-3">Logs</h2>
        {logs.length === 0 ? (
          <p className="text-sm text-muted-foreground">No logs recorded.</p>
        ) : (
          <div className="rounded-lg border border-border bg-muted/30 font-mono text-xs">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex gap-3 border-b border-border px-3 py-2 last:border-0"
              >
                <span className="text-muted-foreground tabular-nums shrink-0">
                  {log.createdAt.toLocaleTimeString()}
                </span>
                <Badge
                  variant={
                    log.level === "error"
                      ? "destructive"
                      : log.level === "warn"
                        ? "secondary"
                        : "outline"
                  }
                  className="text-[10px] px-1 py-0 shrink-0"
                >
                  {log.level}
                </Badge>
                <span className="break-all">{log.message}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
