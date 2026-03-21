// SSE event bus for real-time dashboard updates

type EventHandler = (event: DashboardEvent) => void;

export type DashboardEvent = {
  type: "task_created" | "task_completed" | "task_failed" | "task_log";
  task?: Record<string, unknown>;
  taskId?: string;
  log?: { level: string; message: string };
};

const listeners = new Set<EventHandler>();

export function subscribe(handler: EventHandler) {
  listeners.add(handler);
  return () => listeners.delete(handler);
}

export function pushEvent(event: DashboardEvent) {
  for (const handler of listeners) {
    try {
      handler(event);
    } catch {
      // ignore handler errors
    }
  }
}
