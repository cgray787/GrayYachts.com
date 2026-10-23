import * as React from "react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import DashboardPage from "@/app/(portal)/portal/dashboard/page";

const state = vi.hoisted(() => ({ user: null as null | { id: string }, fail: false, from: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({
  auth: { getUser: async () => ({ data: { user: state.user } }) },
  from: state.from,
}) }));
vi.mock("next/navigation", () => ({ redirect: (url: string) => { throw new Error("redirect:" + url); } }));
vi.mock("@/app/(portal)/portal/dashboard/dashboard-client", () => ({ default: () => null }));

type Result = { data: unknown; count: number; error: null | { message: string } };
type Query = PromiseLike<Result> & Record<"select" | "eq" | "order" | "gte" | "limit" | "single", (...args: unknown[]) => Query>;

describe("portal dashboard truthfulness", () => {
  beforeEach(() => {
    vi.stubGlobal("React", React);
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.example.invalid");
    state.user = { id: "owner-test" }; state.fail = false; state.from.mockReset();
    state.from.mockImplementation((table: string) => {
      const result = Promise.resolve({ data: table === "profiles" ? { full_name: "" } : [], count: 0, error: state.fail ? { message: "unavailable" } : null });
      const query: Query = { select: () => query, eq: () => query, order: () => query, gte: () => query, limit: () => query, single: () => query, then: result.then.bind(result) };
      return query;
    });
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
  it("keeps unauthenticated redirects outside the data-error fallback", async () => {
    state.user = null;
    await expect(DashboardPage()).rejects.toThrow("redirect:/login");
    expect(state.from).not.toHaveBeenCalled();
  });
  it("does not invent a client name or sample fleet for an empty account", async () => {
    const page = await DashboardPage();
    expect(page.props.firstName).toBe("");
    expect(page.props.yachts).toEqual([]); expect(page.props.activities).toEqual([]);
    expect(page.props.stats.yachtCount).toBe(0); expect(page.props.dataUnavailable).toBe(false);
  });
  it("shows unavailable data instead of sample yachts or misleading empty counts on a database failure", async () => {
    state.fail = true;
    const page = await DashboardPage();
    expect(page.props.dataUnavailable).toBe(true); expect(page.props.yachts).toEqual([]);
  });
});
