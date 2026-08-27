# Gray Yachts — Facebook CRM Bridge

Read-only Chrome bridge for importing the visible portion of a Facebook
Messenger conversation into the Gray Yachts FB CRM.

## Install / update

1. Open `chrome://extensions`
2. Turn on **Developer mode**
3. **Load unpacked** and select `tools/gy-marketplace-extension`
4. If it was already loaded, click its **Reload** button
5. Reload `https://grayyachts.com/portal/leads/new`

Be signed into Facebook in the same Chrome profile.

## How chat import works

1. In Facebook Messenger, open the seller conversation and copy its URL.
2. Paste the Marketplace listing URL and Messenger URL into **FB CRM → Add lead**.
3. Click **Check open chat**.
4. The extension opens the chat in a background tab and reads only message text
   currently rendered in that logged-in browser session.
5. Review the transcript in the CRM before adding the lead.

The CRM still supports manual transcript paste when the extension is unavailable
or Facebook changes its markup.

## Safety boundary

- The active CRM integration is **read-only**. It does not send Messenger messages.
- It does not store Facebook cookies, passwords, encryption PINs, or session data.
- It reads only the conversation text Facebook already rendered in your browser.
- A block, checkpoint, or identity-verification screen causes an immediate abort.
- Facebook changes its DOM frequently; failed parsing must fail visibly rather
  than silently importing the wrong text.

Historical sender code remains in the extension package for reference, but the
current portal does not call it. Outreach remains copy-and-open with explicit
human confirmation after sending.

## Troubleshooting

| Message | Meaning |
|---|---|
| `Manual paste available` | Extension is missing, stale, or not reloaded |
| `No visible message text found` | Open the thread and scroll to the messages you want imported |
| `This is not a Messenger thread` | Paste a `/messages/...` Facebook URL |
| `Facebook is showing a block/verification screen` | Stop and resolve the Facebook warning manually |
