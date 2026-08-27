import { test, expect } from "@playwright/test";
import { pathToFileURL } from "node:url";
import path from "node:path";

/**
 * Smoke test for the FB CRM mockup.
 *
 * It checks the things a screenshot cannot: that the comment boxes actually
 * open, persist across a reload, and that "Copy all feedback" produces the text
 * Connor is meant to paste back. A mock whose feedback loop silently fails is
 * worse than no mock — he'd write notes that go nowhere.
 */
const FILE = pathToFileURL(
  path.join(process.cwd(), "docs/superpowers/mockups/fb-crm-mock.html"),
).href;

test.beforeEach(async ({ page }) => {
  await page.goto(FILE);
});

test("renders all four sections", async ({ page }) => {
  for (const heading of ["Today's queue", "Add a lead", "Lead profile", "Morning email"]) {
    await expect(page.getByRole("heading", { name: heading })).toBeVisible();
  }
});

test("queue shows real leads with a reason and a ready message", async ({ page }) => {
  const cards = page.locator(".card");
  await expect(cards).toHaveCount(3);

  // Scope to the card's own price element. "$750,000" also appears in the
  // deal-terms line and again in the digest, so an unscoped getByText is
  // ambiguous under strict mode.
  const first = cards.first();
  await expect(first.locator(".ask")).toHaveText("$389,000");
  await expect(first.locator(".boat")).toContainText("Jeanneau");
  await expect(first.locator(".pill")).toHaveText("due today");

  // Every card must carry the "why" and a copyable message — without those the
  // queue is just a list, which is the thing this design exists to avoid.
  for (let i = 0; i < 3; i++) {
    await expect(cards.nth(i).locator(".why")).toBeVisible();
    await expect(cards.nth(i).locator("pre.msg")).not.toBeEmpty();
  }
});

test("comment box opens, saves, and survives a reload", async ({ page }) => {
  const queue = page.locator('.sec[data-key="queue"]');
  await queue.getByRole("button", { name: /^Comment/ }).click();

  const ta = queue.locator("textarea");
  await expect(ta).toBeVisible();
  await ta.fill("Put the seller's phone number on the card.");
  await queue.getByRole("button", { name: "Save note" }).click();

  await expect(queue).toHaveAttribute("data-has-comment", "1");
  await expect(page.locator("#n")).toHaveText("1");

  await page.reload();
  await expect(page.locator("#n")).toHaveText("1");
  await expect(page.locator('.sec[data-key="queue"] textarea')).toHaveValue(
    "Put the seller's phone number on the card.",
  );
});

test("copy all feedback gathers every note", async ({ page, context }) => {
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);

  for (const [key, text] of [
    ["queue", "Bigger photos."],
    ["digest", "Send at 6am."],
  ] as const) {
    const sec = page.locator(`.sec[data-key="${key}"]`);
    await sec.getByRole("button", { name: /^Comment/ }).click();
    await sec.locator("textarea").fill(text);
    await sec.getByRole("button", { name: "Save note" }).click();
  }

  await page.getByRole("button", { name: "Copy all feedback" }).click();
  const clip = await page.evaluate(() => navigator.clipboard.readText());

  expect(clip).toContain("Today's queue");
  expect(clip).toContain("Bigger photos.");
  expect(clip).toContain("Morning email");
  expect(clip).toContain("Send at 6am.");
});

test("clear removes all notes", async ({ page }) => {
  const sec = page.locator('.sec[data-key="profile"]');
  await sec.getByRole("button", { name: /^Comment/ }).click();
  await sec.locator("textarea").fill("temp");
  await sec.getByRole("button", { name: "Save note" }).click();
  await expect(page.locator("#n")).toHaveText("1");

  await page.getByRole("button", { name: "Clear" }).click();
  await expect(page.locator("#n")).toHaveText("0");
  await expect(sec.locator("textarea")).toHaveValue("");
});

test("no horizontal overflow at phone width", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const overflows = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1,
  );
  expect(overflows).toBe(false);
});
