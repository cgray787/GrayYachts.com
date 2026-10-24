// @ts-ignore OpenNext generates this module during build.
import handler from './.open-next/worker.js';
import {runNewsletter} from './src/lib/newsletter/generate';
import type {NewsletterEnv} from './src/lib/newsletter/core';
// Durable Object class bound as RATE_LIMITER in wrangler.jsonc (src/lib/rate-limit.ts).
export {RateLimiterDO} from './src/lib/rate-limiter-do';
export default {
 fetch: handler.fetch,
 async scheduled(_event: unknown, env: NewsletterEnv) {
  console.log('newsletter', await runNewsletter(env));
 },
};
