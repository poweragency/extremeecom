import { NextRequest } from "next/server";
import { addSSEClient, removeSSEClient } from "./emitter";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(_request: NextRequest) {
  const clientId = crypto.randomUUID();

  const stream = new ReadableStream({
    start(controller) {
      addSSEClient(clientId, controller);

      // Heartbeat ogni 30 secondi per mantenere la connessione viva
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            new TextEncoder().encode(`: heartbeat\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
          removeSSEClient(clientId);
        }
      }, 30000);

      // Messaggio di connessione iniziale
      controller.enqueue(
        new TextEncoder().encode(
          `data: ${JSON.stringify({ type: "connected", clientId })}\n\n`
        )
      );
    },
    cancel() {
      removeSSEClient(clientId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
