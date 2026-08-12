/**
 * Bridges the portal page to the extension.
 *
 * The portal cannot talk to chrome.runtime directly (it is not an extension
 * page), so this content script sits in between: it announces the extension's
 * presence on the window, listens for the portal's send request, and relays
 * the result. The portal degrades to copy-and-open when this never appears.
 */

window.postMessage({ source: "gy-ext", type: "GY_EXT_READY" }, window.location.origin);

window.addEventListener("message", async (event) => {
  if (event.source !== window) return;
  const msg = event.data;
  if (!msg || msg.source !== "gy-portal") return;

  if (msg.type === "GY_EXT_PING") {
    const res = await chrome.runtime.sendMessage({ type: "GY_PING" }).catch(() => null);
    window.postMessage(
      { source: "gy-ext", type: "GY_EXT_PONG", ...(res || { ok: false }) },
      window.location.origin,
    );
    return;
  }

  if (msg.type === "GY_EXT_SEND") {
    const res = await chrome.runtime
      .sendMessage({ type: "GY_SEND_OPENER", url: msg.url, body: msg.body })
      .catch((e) => ({ ok: false, reason: String(e?.message || e) }));
    window.postMessage(
      { source: "gy-ext", type: "GY_EXT_SENT", requestId: msg.requestId, ...res },
      window.location.origin,
    );
  }
});
