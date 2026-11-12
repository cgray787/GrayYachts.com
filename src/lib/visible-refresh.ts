/** Refresh server data only while a page is being viewed, and on return. */
export function startVisibleRefresh(refresh: () => void, intervalMs = 60_000) {
  const whenVisible = () => {
    if (document.visibilityState === "visible") refresh();
  };
  const timer = window.setInterval(whenVisible, intervalMs);
  document.addEventListener("visibilitychange", whenVisible);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", whenVisible);
  };
}
