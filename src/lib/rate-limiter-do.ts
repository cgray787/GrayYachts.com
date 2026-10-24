/**
 * Durable Object that reserves rate-limit quota atomically.
 *
 * One object per `prefix:ip` (see `rateLimited` in ./rate-limit.ts). A Durable
 * Object processes its events one at a time, and the whole read-check-write
 * below runs inside `blockConcurrencyWhile`, so no other request for the same
 * visitor can interleave between reading the count and storing the increment:
 * N concurrent requests reserve exactly `limit` slots, never more. This replaces
 * a Workers KV counter, which is not atomic and accepts only one write per key
 * per second, so a concurrent burst could pass every request through.
 *
 * SQLite-backed (`new_sqlite_classes` in wrangler.jsonc), which is the class
 * type the Workers Free plan supports. Each object stores one small record and
 * deletes it with an alarm once its window has passed.
 *
 * Exported from the Worker entry (newsletter-worker.ts). Written against
 * minimal structural types rather than `cloudflare:workers` so unit tests can
 * construct it directly.
 */

export type RateLimiterState = {
  blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T>;
  storage: {
    get<T>(key: string): Promise<T | undefined>;
    put<T>(key: string, value: T): Promise<void>;
    deleteAll(): Promise<void>;
    setAlarm(scheduledTime: number): Promise<void>;
  };
};

export type ReserveRequest = { limit: number; windowS: number };
export type ReserveResult = { allowed: boolean; count: number; retryAfterS: number };

type Window = { bucket: number; count: number };

export class RateLimiterDO {
  // The runtime also passes `env` as a second argument; this object does not need it.
  constructor(private readonly state: RateLimiterState) {}

  async fetch(request: Request): Promise<Response> {
    let body: ReserveRequest;
    try {
      body = (await request.json()) as ReserveRequest;
    } catch {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }
    const { limit, windowS } = body ?? ({} as ReserveRequest);
    if (!Number.isInteger(limit) || limit < 1 || !Number.isInteger(windowS) || windowS < 1) {
      return Response.json({ error: "bad_request" }, { status: 400 });
    }
    return Response.json(await this.reserve(limit, windowS));
  }

  /** Atomically take one slot from the current fixed window, if one is left. */
  async reserve(limit: number, windowS: number): Promise<ReserveResult> {
    return this.state.blockConcurrencyWhile(async () => {
      const nowS = Math.floor(Date.now() / 1000);
      const bucket = Math.floor(nowS / windowS);
      const retryAfterS = windowS - (nowS % windowS);
      const stored = await this.state.storage.get<Window>("w");
      const count = stored && stored.bucket === bucket ? stored.count : 0;
      if (count >= limit) return { allowed: false, count, retryAfterS };
      await this.state.storage.put<Window>("w", { bucket, count: count + 1 });
      // Clean up after the window ends; a later reservation just re-arms it.
      await this.state.storage.setAlarm((bucket + 2) * windowS * 1000);
      return { allowed: true, count: count + 1, retryAfterS };
    });
  }

  async alarm(): Promise<void> {
    await this.state.storage.deleteAll();
  }
}
