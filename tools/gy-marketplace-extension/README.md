# Gray Yachts — Marketplace Sender

Makes **SEND THE OPENER** in the portal actually send the message on Facebook
Marketplace, instead of copying it for you to paste.

## Why an extension is required

A page on `grayyachts.com` cannot script `facebook.com`. Same-origin policy
forbids it, and no amount of code in the portal changes that. An extension is
the only thing allowed to act in both places, which is why this exists rather
than a button that "just works".

## Install (about a minute)

1. Open `chrome://extensions`
2. Turn on **Developer mode** (top right)
3. **Load unpacked** → select this folder
   (`tools/gy-marketplace-extension`)
4. Reload `grayyachts.com/portal/leads`

The button's caption tells you which mode you're in:

| Caption | Mode |
|---|---|
| *Sends on Marketplace for you, then marks it sent.* | extension active |
| *Copies the message, opens the listing, and marks it sent.* | extension absent |

Be signed into Facebook in the same Chrome profile.

## What happens on click

1. Opens the listing in a background tab
2. Waits for Marketplace to hydrate
3. Types the opener into the seller composer and clicks **Send**
4. Confirms the composer cleared — proof it actually went
5. Reports back; only then does the lead advance to **Opener sent**

**A failed send is never logged as sent.** A lead wrongly marked "contacted"
is worse than one still sitting in the queue.

The tab is left open on purpose so you can see exactly what went out.

## Safety limits — deliberate, not incidental

- **20 sends/day**, resetting at midnight
- **30–90s randomised gap** between sends
- **Hard abort** on any Facebook block, checkpoint, captcha or "we limit how
  often" screen — it stops rather than pushing through
- Selectors anchor to visible text (the composer placeholder, the Send button's
  accessible name) rather than Facebook's obfuscated class names, so a layout
  change makes it fail loudly instead of clicking the wrong control

## Read this before you rely on it

Meta's terms prohibit scripted actions. **This carries a real risk of the
account being restricted or banned — and that account is the entire lead
pipeline.** The caps above reduce the risk; they don't remove it.

Start with three sends, check the threads in Messenger, and stop immediately if
Facebook shows any warning.

## When it breaks

Facebook changes its DOM often. Symptoms and meaning:

| Message | Cause |
|---|---|
| "Could not find the message box" | composer markup changed — update `findComposer()` |
| "no Send button found" | Send control renamed — update `findSendButton()` |
| "Facebook is showing a block screen" | **stop sending today** |
| "Pacing — wait Ns" | working as intended |
