import { RateLimiterDO, type RateLimiterState } from "@/lib/rate-limiter-do";
import type { LimiterNamespace } from "@/lib/rate-limit";

/** Yields to the event loop so concurrent callers really interleave at every storage await. */
const tick = () => new Promise<void>(resolve => queueMicrotask(resolve));

/**
 * In-memory state with async storage. `serialize: true` mirrors the Durable
 * Object guarantee that `blockConcurrencyWhile` runs callbacks one at a time;
 * `serialize: false` lets them interleave, which is what a non-atomic counter
 * (like the old KV one) looks like, so tests can prove they detect overshoot.
 */
export function fakeState({ serialize = true } = {}): RateLimiterState & { data: Map<string, unknown>; alarmAt: number | null } {
  const data = new Map<string, unknown>();
  let chain: Promise<unknown> = Promise.resolve();
  const state = {
    data,
    alarmAt: null as number | null,
    blockConcurrencyWhile<T>(fn: () => Promise<T>): Promise<T> {
      if (!serialize) return fn();
      const run = chain.then(fn, fn);
      chain = run.catch(() => undefined);
      return run;
    },
    storage: {
      async get<T>(key: string) { await tick(); await tick(); return data.get(key) as T | undefined; },
      async put<T>(key: string, value: T) { await tick(); data.set(key, structuredClone(value)); },
      async deleteAll() { await tick(); data.clear(); },
      async setAlarm(t: number) { await tick(); state.alarmAt = t; },
    },
  };
  return state;
}

/** A DurableObjectNamespace stand-in that runs the real RateLimiterDO, one instance per name. */
export function fakeLimiterNamespace() {
  const objects = new Map<string, RateLimiterDO>();
  const object = (name: string) => {
    let o = objects.get(name);
    if (!o) { o = new RateLimiterDO(fakeState()); objects.set(name, o); }
    return o;
  };
  const ns: LimiterNamespace & { objects: Map<string, RateLimiterDO>; fetches: number; seed(name: string, count: number, limit: number, windowS: number): Promise<void> } = {
    objects,
    fetches: 0,
    idFromName: (name: string) => ({ name }),
    get: (id: unknown) => ({
      fetch: async (input: string, init?: RequestInit) => {
        ns.fetches++;
        return object((id as { name: string }).name).fetch(new Request(input, init));
      },
    }),
    /** Use up `count` slots for `name` in the current window. */
    async seed(name, count, limit, windowS) {
      for (let i = 0; i < count; i++) await object(name).reserve(limit, windowS);
    },
  };
  return ns;
}
