import type { Request, Response } from './protocol';

type Pending = { resolve: (r: Response) => void; reject: (e: Error) => void };

/** Cliente del worker: cada pedido es una promesa. Los pedidos viejos del mismo tipo se descartan. */
export class Engine {
  private worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });
  private seq = 0;
  private pending = new Map<number, Pending>();
  private latest = new Map<string, number>();

  constructor() {
    this.worker.onmessage = (ev: MessageEvent<Response & { id: number }>) => {
      const p = this.pending.get(ev.data.id);
      if (!p) return;
      this.pending.delete(ev.data.id);
      if (ev.data.type === 'error') p.reject(new Error(ev.data.message));
      else p.resolve(ev.data);
    };
  }

  /** Devuelve null si mientras tanto llegó un pedido más nuevo del mismo tipo. */
  async call<T extends Response['type']>(req: Request, transfer: Transferable[] = []): Promise<Extract<Response, { type: T }> | null> {
    const id = ++this.seq;
    const k = req.type + ('key' in req ? `:${req.key}` : '');
    this.latest.set(k, id);
    const res = await new Promise<Response>((resolve, reject) => {
      this.pending.set(id, { resolve, reject });
      this.worker.postMessage({ ...req, id }, transfer);
    });
    if (this.latest.get(k) !== id && req.type !== 'export' && req.type !== 'load') return null;
    return res as Extract<Response, { type: T }>;
  }
}
