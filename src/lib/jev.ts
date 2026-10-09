/**
 * Thin wrapper around TypeSafe's Jev (System One) model.
 *
 * Jev returns typed judgments — a probability (noul), a chosen label with
 * probabilities (choice), or a position on an ordered scale (score) — never
 * prose. Code owns the workflow; Jev only answers narrow questions.
 *
 * Rules enforced here:
 *  - Never throws. A missing key, timeout, or API error yields `null` so every
 *    caller falls back to its pre-Jev behaviour.
 *  - Short timeout (6s) — these calls sit inside server actions and a scrape
 *    route; a slow judgment must not stall the user.
 *  - The key is read at call time from process.env (wrangler secret
 *    TYPESAFE_API_KEY), never baked into the bundle.
 */
import { TypeSafeClient, type Questions, type SystemOneResult } from "@typesafe-ai/sdk";

export { choice, noul, score } from "@typesafe-ai/sdk";

const TIMEOUT_MS = 6_000;

export function jevAvailable(): boolean {
  return Boolean(process.env.TYPESAFE_API_KEY);
}

export async function jev<const Q extends Questions>(
  state: unknown,
  questions: Q,
  label = "jev",
): Promise<SystemOneResult<Q> | null> {
  const apiKey = process.env.TYPESAFE_API_KEY;
  if (!apiKey) return null;
  try {
    const client = new TypeSafeClient({ apiKey, timeout: TIMEOUT_MS, retry: { maxRetries: 1 } });
    const started = Date.now();
    const result = await client.systemOne({ state: state as never, questions });
    console.log(`[${label}] model=${result.model} in=${result.usage?.input_tokens} ${Date.now() - started}ms`);
    return result;
  } catch (error) {
    console.error(`[${label}] Jev unavailable:`, error instanceof Error ? error.message : String(error));
    return null;
  }
}
