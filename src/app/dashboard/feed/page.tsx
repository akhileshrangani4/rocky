"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { DashboardEvent } from "@/lib/events";

export default function FeedPage() {
  const [events, setEvents] = useState<(DashboardEvent & { timestamp: string })[]>([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const evtSource = new EventSource("/api/dashboard/stream");

    evtSource.onopen = () => setConnected(true);
    evtSource.onerror = () => setConnected(false);

    evtSource.onmessage = (e) => {
      try {
        const event = JSON.parse(e.data) as DashboardEvent;
        setEvents((prev) => [
          { ...event, timestamp: new Date().toLocaleTimeString() },
          ...prev.slice(0, 199),
        ]);
      } catch {
        // ignore parse errors
      }
    };

    return () => evtSource.close();
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Live Feed</h1>
          <p className="text-muted-foreground">Real-time activity stream</p>
        </div>
        <Badge variant={connected ? "default" : "destructive"}>
          {connected ? "Connected" : "Disconnected"}
        </Badge>
      </div>

      <ScrollArea className="h-[calc(100vh-12rem)] rounded-lg border border-border bg-card">
        <div className="flex flex-col divide-y divide-border">
          {events.length === 0 && (
            <div className="p-8 text-center text-muted-foreground">
              Waiting for events...
            </div>
          )}
          {events.map((event, i) => (
            <div key={i} className="flex items-start gap-3 px-4 py-3">
              <span className="mt-0.5 text-xs text-muted-foreground font-mono tabular-nums">
                {event.timestamp}
              </span>
              <EventBadge type={event.type} />
              <span className="text-sm">
                {event.type === "task_created" &&
                  `New task: ${(event.task as Record<string, string>)?.input?.slice(0, 100) ?? "unknown"}`}
                {event.type === "task_completed" &&
                  `Task completed: ${event.taskId}`}
                {event.type === "task_failed" &&
                  `Task failed: ${event.taskId}`}
                {event.type === "task_log" &&
                  `[${event.log?.level}] ${event.log?.message}`}
              </span>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}

function EventBadge({ type }: { type: string }) {
  const variant: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    task_created: "outline",
    task_completed: "default",
    task_failed: "destructive",
    task_log: "secondary",
  };
  return (
    <Badge variant={variant[type] ?? "outline"} className="text-[10px] shrink-0">
      {type.replace("task_", "")}
    </Badge>
  );
}
