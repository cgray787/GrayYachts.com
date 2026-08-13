/**
 * Runs inside a Marketplace listing page and performs the actual send.
 *
 * Facebook's class names are obfuscated and rotate, so every selector here is
 * anchored to something user-visible instead — the composer's placeholder text
 * and the Send control's accessible name. Those are far more stable, and when
 * they do change this fails loudly rather than clicking the wrong thing.
 *
 * It aborts on any checkpoint/verification screen rather than trying to work
 * through it — that is Facebook telling us to stop.
 */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function blocked() {
  const t = document.body.innerText.slice(0, 4000).toLowerCase();
  return (
    t.includes("you're temporarily blocked") ||
    t.includes("we limit how often") ||
    t.includes("confirm your identity") ||
    t.includes("security check") ||
    t.includes("suspicious activity")
  );
}

function findComposer() {
  // The seller composer is a textarea/contenteditable whose placeholder is the
  // canned "Hi, is this available?" prompt.
  const byPlaceholder = [...document.querySelectorAll("textarea, [contenteditable='true']")].find(
    (el) => {
      const ph = (el.getAttribute("placeholder") || el.getAttribute("aria-label") || "").toLowerCase();
      return ph.includes("is this available") || ph.includes("message") || ph.includes("send seller");
    },
  );
  if (byPlaceholder) return byPlaceholder;
  // Fallback: the only visible textarea on a listing page is the composer.
  return [...document.querySelectorAll("textarea")].find((el) => el.offsetParent !== null) || null;
}

function findSendButton() {
  const cands = [...document.querySelectorAll("[role='button'], button")];
  return (
    cands.find((b) => {
      const label = (b.getAttribute("aria-label") || b.innerText || "").trim().toLowerCase();
      return label === "send" && b.offsetParent !== null;
    }) || null
  );
}

/** React ignores .value assignment; go through the native setter it patched. */
function setNativeValue(el, value) {
  const proto = el instanceof HTMLTextAreaElement
    ? HTMLTextAreaElement.prototype
    : HTMLInputElement.prototype;
  const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
  if (setter) setter.call(el, value);
  else el.value = value;
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.dispatchEvent(new Event("change", { bubbles: true }));
}

async function fillAndSend(body) {
  if (blocked()) return { ok: false, reason: "Facebook is showing a block/verification screen — stopped." };

  let composer = null;
  for (let i = 0; i < 20 && !composer; i++) {
    composer = findComposer();
    if (!composer) await sleep(500);
  }
  if (!composer) return { ok: false, reason: "Could not find the message box on this listing." };

  composer.focus();
  if (composer.tagName === "TEXTAREA") {
    setNativeValue(composer, body);
  } else {
    // contenteditable — insertText keeps React's internal state in sync
    document.execCommand("selectAll", false);
    document.execCommand("insertText", false, body);
  }
  await sleep(600);

  const btn = findSendButton();
  if (!btn) return { ok: false, reason: "Message typed, but no Send button found — send it manually." };
  if (btn.getAttribute("aria-disabled") === "true" || btn.disabled) {
    return { ok: false, reason: "Send is disabled — the text may not have registered." };
  }

  btn.click();
  await sleep(2500);

  if (blocked()) return { ok: false, reason: "Facebook blocked the send — stopped." };

  // The composer clears on a successful send.
  const after = findComposer();
  const cleared = !after || (after.value ?? after.innerText ?? "").trim() === "";
  return cleared
    ? { ok: true }
    : { ok: false, reason: "Clicked Send but the box still has text — verify manually." };
}

chrome.runtime.onMessage.addListener((msg, _s, reply) => {
  if (msg?.type === "GY_SEND") {
    fillAndSend(msg.body).then(reply);
    return true;
  }
});
