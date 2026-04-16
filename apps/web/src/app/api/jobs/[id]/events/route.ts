import { NextRequest } from "next/server";
import Redis from "ioredis";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const stream = new ReadableStream({
    start(controller) {
      const sub = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
      const channel = `job:${id}:status`;

      const encoder = new TextEncoder();
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      sub.subscribe(channel).catch(() => {});

      sub.on("message", (_ch: string, message: string) => {
        send(message);
        try {
          const parsed = JSON.parse(message);
          if (
            [
              "SUCCEEDED",
              "FAILED",
              "DOWNLOAD_FAILED",
              "CANCELED",
              "BUDGET_EXCEEDED",
            ].includes(parsed.status)
          ) {
            sub.unsubscribe(channel).catch(() => {});
            sub.quit().catch(() => {});
            controller.close();
          }
        } catch {
          /* ignore parse errors */
        }
      });

      send(JSON.stringify({ status: "connected", jobId: id }));

      const timeout = setTimeout(
        () => {
          sub.unsubscribe(channel).catch(() => {});
          sub.quit().catch(() => {});
          try {
            controller.close();
          } catch {
            /* already closed */
          }
        },
        5 * 60 * 1000,
      );

      _req.signal.addEventListener("abort", () => {
        clearTimeout(timeout);
        sub.unsubscribe(channel).catch(() => {});
        sub.quit().catch(() => {});
      });
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
