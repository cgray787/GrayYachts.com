/**
 * Orchestrates one send: open the listing, hand the text to the Facebook
 * content script, wait for its verdict, report back to the portal.
 *
 * Pacing and caps live here rather than in the portal, because this is the
 * only place that sees every send regardless of which tab triggered it.
 */

const DAILY_CAP = 20;          // conservative; Meta flags bursts
const MIN_GAP_MS = 30_000;     // randomised 30-90s between sends
const MAX_GAP_MS = 90_000;
const LOAD_TIMEOUT_MS = 45_000;

const today = () => new Date().toISOString().slice(0, 10);

async function getState() {
  const { gyState } = await chrome.storage.local.get("gyState");
  if (!gyState || gyState.day !== today()) return { day: today(), sent: 0, lastAt: 0 };
  return gyState;
}
const setState = (s) => chrome.storage.local.set({ gyState: s });

function waitForTab(tabId) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(listener);
      reject(new Error("Listing took too long to load."));
    }, LOAD_TIMEOUT_MS);
    function listener(id, info) {
      if (id === tabId && info.status === "complete") {
        clearTimeout(timer);
        chrome.tabs.onUpdated.removeListener(listener);
        // Marketplace hydrates after load; give the composer a moment.
        setTimeout(resolve, 2500);
      }
    }
    chrome.tabs.onUpdated.addListener(listener);
  });
}

async function sendOpener({ url, body }) {
  const state = await getState();

  if (state.sent >= DAILY_CAP) {
    return { ok: false, reason: `Daily cap reached (${DAILY_CAP}). Resets tomorrow.` };
  }
  const since = Date.now() - (state.lastAt || 0);
  const gap = MIN_GAP_MS + Math.random() * (MAX_GAP_MS - MIN_GAP_MS);
  if (state.lastAt && since < gap) {
    const wait = Math.ceil((gap - since) / 1000);
    return { ok: false, reason: `Pacing — wait ${wait}s before the next send.` };
  }

  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await waitForTab(tab.id);
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GY_SEND", body });
    if (res?.ok) {
      await setState({ day: today(), sent: state.sent + 1, lastAt: Date.now() });
      // Leave the tab open so Connor can eyeball what actually went out.
      return { ok: true, remaining: DAILY_CAP - (state.sent + 1) };
    }
    return { ok: false, reason: res?.reason || "Could not send in the page." };
  } catch (e) {
    return { ok: false, reason: String(e.message || e) };
  }
}

async function importChat({ url }) {
  if (!/^https:\/\/(www\.|web\.)?facebook\.com\/messages\//i.test(url || "")) {
    return { ok: false, reason: "Paste a Facebook Messenger thread URL." };
  }
  const tab = await chrome.tabs.create({ url, active: false });
  try {
    await waitForTab(tab.id);
    const res = await chrome.tabs.sendMessage(tab.id, { type: "GY_READ_CHAT" });
    return res?.ok ? res : { ok: false, reason: res?.reason || "Could not read the chat." };
  } catch (e) {
    return { ok: false, reason: String(e.message || e) };
  }
}

chrome.runtime.onMessage.addListener((msg, _sender, reply) => {
  if (msg?.type === "GY_SEND_OPENER") {
    sendOpener(msg).then(reply);
    return true; // async
  }
  if (msg?.type === "GY_PING") {
    getState().then((s) =>
      reply({ ok: true, version: chrome.runtime.getManifest().version, sentToday: s.sent, cap: DAILY_CAP }),
    );
    return true;
  }
  if (msg?.type === "GY_IMPORT_CHAT") {
    importChat(msg).then(reply);
    return true;
  }
});
