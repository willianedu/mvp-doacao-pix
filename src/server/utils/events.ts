import { Response } from 'express';

type SseClient = {
  id: number;
  res: Response;
};

let nextClientId = 1;
const clients = new Map<number, SseClient>();

export function registerSseClient(res: Response): () => void {
  const id = nextClientId++;
  clients.set(id, { id, res });

  return () => {
    clients.delete(id);
  };
}

export function broadcastEvent(eventName: string, payload: unknown): void {
  const data = JSON.stringify(payload);
  for (const client of clients.values()) {
    try {
      client.res.write(`event: ${eventName}\n`);
      client.res.write(`data: ${data}\n\n`);
    } catch {
      clients.delete(client.id);
    }
  }
}
