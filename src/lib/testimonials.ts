/**
 * Client testimonials for the homepage.
 *
 * ⚠️ REAL QUOTES ONLY. Never invent, paraphrase into something the client
 * did not say, or attribute a quote to someone who did not give it. Beyond
 * being dishonest, fabricated reviews on a commercial site are an FTC
 * violation (16 CFR Part 465, in force since 2024) with civil penalties per
 * violation — and Connor's buyers know these boats and these owners.
 *
 * The homepage section renders NOTHING while this array is empty, so the
 * site is never showing fake social proof.
 *
 * To add one:
 *   1. Get it in writing (email or text) from the client.
 *   2. Confirm they're happy to be named publicly alongside their vessel.
 *   3. Paste the quote verbatim. Trim with an ellipsis if long; don't reword.
 */

export type Testimonial = {
  /** Verbatim, in the client's own words. */
  quote: string;
  /** How they've agreed to be credited, e.g. "Ed H." or "Ed Houghton". */
  name: string;
  /** Optional context line, e.g. "2023 Quicksilver 675 Weekend · Seattle". */
  context?: string;
};

export const testimonials: Testimonial[] = [
  // Empty on purpose — see the note above. Add real, permissioned quotes here.
];
