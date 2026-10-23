import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startVisibleRefresh } from "./visible-refresh";

describe("visible server refresh", () => {
  let page: EventTarget & { visibilityState: string };
  beforeEach(() => {
    vi.useFakeTimers();
    page = Object.assign(new EventTarget(), { visibilityState: "visible" });
    vi.stubGlobal("document", page);
    vi.stubGlobal("window", { setInterval, clearInterval });
  });
  afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("refreshes visible data once per interval", () => {
    const refresh = vi.fn(); const stop = startVisibleRefresh(refresh);
    vi.advanceTimersByTime(180_000);
    expect(refresh).toHaveBeenCalledTimes(3); stop();
  });
  it("avoids backend requests from a hidden tab and catches up on return", () => {
    page.visibilityState = "hidden";
    const refresh = vi.fn(); const stop = startVisibleRefresh(refresh);
    vi.advanceTimersByTime(3_600_000);
    expect(refresh).not.toHaveBeenCalled();
    page.visibilityState = "visible"; page.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).toHaveBeenCalledTimes(1); stop();
  });
  it("removes both triggers when the page unmounts", () => {
    const refresh = vi.fn(); const stop = startVisibleRefresh(refresh); stop();
    vi.advanceTimersByTime(120_000); page.dispatchEvent(new Event("visibilitychange"));
    expect(refresh).not.toHaveBeenCalled();
  });
});
