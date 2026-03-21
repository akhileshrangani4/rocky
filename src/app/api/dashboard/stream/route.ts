import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { subscribe, type DashboardEvent } from "@/lib/events";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      const unsubscribe = subscribe((event: DashboardEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      });

      // Send heartbeat every 30s
      const heartbeat = setInterval(() => {
        controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 30000);

      // Cleanup on close
      const cleanup = () => {
        unsubscribe();
        clearInterval(heartbeat);
      };

      // Store cleanup for cancel
      (controller as unknown as Record<string, () => void>)._cleanup = cleanup;
    },
    cancel(controller) {
      const cleanup = (controller as unknown as Record<string, () => void>)._cleanup;
      if (cleanup) cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
