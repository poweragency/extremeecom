// Registro dei client SSE connessi (in-memory, funziona su single instance)
// Per multi-instance su Vercel usare Redis pub/sub
type SSEClient = {
  id: string;
  controller: ReadableStreamDefaultController;
};

const clients = new Map<string, SSEClient>();

export function addSSEClient(id: string, controller: ReadableStreamDefaultController) {
  clients.set(id, { id, controller });
}

export function removeSSEClient(id: string) {
  clients.delete(id);
}

export function emitSSEEvent(data: unknown) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  const encoded = new TextEncoder().encode(message);

  const toRemove: string[] = [];
  clients.forEach((client) => {
    try {
      client.controller.enqueue(encoded);
    } catch {
      toRemove.push(client.id);
    }
  });

  toRemove.forEach((id) => clients.delete(id));
}
