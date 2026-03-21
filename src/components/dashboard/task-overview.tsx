"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type Task = {
  id: string;
  type: string;
  status: string;
  platform: string;
  input: string;
  output: string | null;
  durationMs: number | null;
  createdAt: Date;
};

const statusColors: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  running: "secondary",
  completed: "default",
  failed: "destructive",
};

const platformIcons: Record<string, string> = {
  slack: "S",
  discord: "D",
  github: "G",
  linear: "L",
  telegram: "T",
};

export function TaskOverview({ tasks }: { tasks: Task[] }) {
  if (tasks.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-card p-8 text-center text-muted-foreground">
        No tasks yet today. Rocky is waiting for instructions.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">Platform</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="max-w-md">Input</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right font-mono">Duration</TableHead>
            <TableHead className="text-right">Time</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {tasks.map((task) => (
            <TableRow key={task.id}>
              <TableCell>
                <span
                  className="inline-flex h-6 w-6 items-center justify-center rounded bg-muted text-xs font-mono font-bold"
                  title={task.platform}
                >
                  {platformIcons[task.platform] ?? "?"}
                </span>
              </TableCell>
              <TableCell className="font-medium">{task.type}</TableCell>
              <TableCell className="max-w-md truncate text-muted-foreground">
                <Link
                  href={`/dashboard/tasks/${task.id}`}
                  className="hover:text-foreground hover:underline"
                >
                  {task.input.slice(0, 80)}
                  {task.input.length > 80 ? "..." : ""}
                </Link>
              </TableCell>
              <TableCell>
                <Badge variant={statusColors[task.status] ?? "outline"}>
                  {task.status}
                </Badge>
              </TableCell>
              <TableCell className="text-right font-mono text-sm tabular-nums">
                {task.durationMs
                  ? `${(task.durationMs / 1000).toFixed(1)}s`
                  : "—"}
              </TableCell>
              <TableCell className="text-right text-sm text-muted-foreground font-mono tabular-nums">
                {task.createdAt.toLocaleTimeString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
