#!/bin/bash
# Watchdog for https://grayyachts.com/sell — the Meta ad destination.
#
# The page has been silently wiped several times by deploys made from
# checkouts that predate it: the deploy reports success, and /sell starts
# 404ing. Paid traffic pointed at a 404 burns budget with nothing to show,
# so this checks the page, repairs it, and emails Connor either way.
#
# Repair is always "rebuild from the production branch and deploy".
#
# Install: ops/com.grayyachts.sell-watchdog.plist (launchd, every 10 minutes;
#          see the install steps in that file)
# Logs:    ~/Library/Logs/grayyachts-sell-watchdog.log
# Test:    scripts/test-sell-watchdog.sh (healthy / outage / recovery, dry run)
#
# Overrides (for testing only; launchd sets none, so defaults apply):
#   WATCHDOG_URL                   page to check (default: production /sell)
#   WATCHDOG_STATE_DIR             state dir (keep tests out of the real job's state)
#   WATCHDOG_DRY_RUN=1             never reset/build/deploy; log what would run
#   WATCHDOG_ALERT_SUBJECT_PREFIX  prepended to every email subject, e.g. "[TEST] "
#   WATCHDOG_REPAIR_WAIT           seconds to wait before re-checking (default 15)
set -uo pipefail

URL="${WATCHDOG_URL:-https://grayyachts.com/sell}"
LEAD_ENDPOINT="https://grayyachts.com/api/valuation"
# Dedicated throwaway checkout used ONLY for repairs: the repair step runs
# `git reset --hard` here, so never keep work in it. Kept separate from the
# main checkout (which launchd runs this script from) so a repair never
# rewrites the running script or anyone's uncommitted work.
REPO="/Users/connorgray/Desktop/Artificial Intelligence/Projects/10 - Gray Yachts/11 - Websites/grayyachts.com/.claude/worktrees/sell-watchdog"
# grayyachts.com is deployed from restore/prod-plus-leads, NOT main. main is
# missing src/app/(marketing)/fleet/[slug], so repairing from main would fix
# /sell and 404 every vessel page in the process.
PROD_BRANCH="restore/prod-plus-leads"
STATE="${WATCHDOG_STATE_DIR:-$HOME/.local/state/grayyachts-sell-watchdog}"
DRY_RUN="${WATCHDOG_DRY_RUN:-0}"
SUBJECT_PREFIX="${WATCHDOG_ALERT_SUBJECT_PREFIX:-}"
REPAIR_WAIT="${WATCHDOG_REPAIR_WAIT:-15}"
ALERT_TO="connorgray@jeffbrownyachts.com"
ALERT_FROM="Gray Yachts Watchdog <onboarding@resend.dev>"
# Expected on a healthy page. If the markup is rewritten, update these.
MUST_CONTAIN="Sell Your Yacht"
MIN_VESSELS=6

mkdir -p "$STATE"
log() { printf '%s  %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"; }

resend_key() {
  security find-generic-password -a grayyachts-watchdog -s resend-api-key -w 2>/dev/null
}

send_mail() {  # subject, body
  local key resp subject="${SUBJECT_PREFIX}$1"
  key="$(resend_key)"
  [ -z "$key" ] && { log "no Resend key in keychain — cannot email"; return 1; }
  resp="$(/usr/bin/curl -s -m 25 -X POST https://api.resend.com/emails \
    -H "Authorization: Bearer $key" -H "Content-Type: application/json" \
    --data "$(/usr/bin/python3 - "$ALERT_FROM" "$ALERT_TO" "$subject" "$2" <<'PY'
import json,sys
print(json.dumps({"from":sys.argv[1],
  "to":[sys.argv[2]],
  "subject":sys.argv[3],
  "text":sys.argv[4]}))
PY
)")"
  # Log Resend's answer: a rejected send used to vanish into /dev/null.
  case "$resp" in
    *'"id"'*) log "emailed \"$subject\" — resend $resp" ;;
    *)        log "EMAIL FAILED \"$subject\" — resend said: ${resp:-<no response>}"; return 1 ;;
  esac
}

# ── health check ────────────────────────────────────────────────────────
check() {
  local body code vessels
  body="$(/usr/bin/curl -sL -m 25 "$URL?wd=$RANDOM" -w '\n%{http_code}')" \
    || { echo "could not reach $URL (curl failed)"; return 2; }
  code="$(printf '%s' "$body" | tail -n1)"
  [ "$code" != "200" ] && { echo "http $code"; return 1; }
  # NB: no `... | grep -q` here. grep -q exits early, the writer takes SIGPIPE,
  # and `set -o pipefail` turns that into a false "page is broken" verdict.
  case "$body" in *"$MUST_CONTAIN"*) ;; *) echo "page loaded but content missing"; return 1;; esac
  vessels="$(printf '%s' "$body" | grep -c 'class="bname"' || true)"
  [ "${vessels:-0}" -lt "$MIN_VESSELS" ] && { echo "only $vessels vessels rendered"; return 1; }
  # the lead endpoint must reject an empty body with 400 — proves it is alive
  local lead
  lead="$(/usr/bin/curl -s -m 25 -o /dev/null -w '%{http_code}' -X POST "$LEAD_ENDPOINT" \
          -H 'Content-Type: application/json' -d '{}')"
  # 429 = rate limited: the worker answered, so the endpoint is alive. Treating
  # it as an outage produced 47 false "DOWN" verdicts on Oct 18-19.
  case "$lead" in
    400|429) ;;
    000) echo "could not reach lead endpoint (curl failed)"; return 2 ;;
    *)   echo "lead endpoint returned $lead, expected 400"; return 1 ;;
  esac
  return 0
}

REASON="$(check)"; CHECK_RC=$?
[ "$CHECK_RC" = "0" ] && HEALTHY=1 || HEALTHY=0

# Couldn't reach the site at all. If this Mac is offline too (sleep/wake,
# Wi-Fi drop) that is not an outage — a redeploy can't fix it and the alert
# couldn't be sent anyway — so don't touch production.
if [ "$CHECK_RC" = "2" ] && ! /usr/bin/curl -s -m 15 -o /dev/null https://api.resend.com; then
  log "inconclusive: $REASON, and this Mac is offline — skipping"
  exit 0
fi

if [ "$HEALTHY" = "1" ]; then
  # Only announce recovery if we were previously down.
  if [ -f "$STATE/down" ]; then
    rm -f "$STATE/down"
    log "recovered"
    send_mail "Gray Yachts: /sell is back up" \
"The landing page at $URL is healthy again.

Checked: page returns 200, content renders, lead endpoint responding.
Leads are being captured normally."
  else
    log "ok"
  fi
  exit 0
fi

log "DOWN: $REASON"

# ── repair: rebuild from the production branch and deploy ───────────────
cd "$REPO" || { log "watchdog checkout missing at $REPO"; exit 1; }
if [ "$DRY_RUN" = "1" ]; then
  # Fetching only updates remote-tracking refs; nothing is reset or deployed.
  git fetch -q origin "$PROD_BRANCH"
  SHA="$(git log --oneline -1 "origin/$PROD_BRANCH" 2>/dev/null)"
  OUT="DRY RUN — would run in $REPO:
  git reset -q --hard origin/$PROD_BRANCH   (-> $SHA)
  npm ci && npm run build && npx --yes opennextjs-cloudflare build && npm run deploy"
  DEPLOY_RC=0
  log "DRY RUN: repair planned, not executed — would deploy $SHA"
else
  # npm ci: the reset can change package-lock.json, and building against the
  # old node_modules either fails or ships the wrong dependency versions.
  OUT="$(
    { git fetch -q origin "$PROD_BRANCH" \
      && git reset -q --hard "origin/$PROD_BRANCH" \
      && npm ci --no-audit --no-fund \
      && npm run build \
      && npx --yes opennextjs-cloudflare build \
      && npm run deploy; } 2>&1
  )"
  DEPLOY_RC=$?
  SHA="$(git log --oneline -1 2>/dev/null)"
fi

sleep "$REPAIR_WAIT"
REASON2="$(check)" && FIXED=1 || FIXED=0

if [ "$FIXED" = "1" ]; then
  rm -f "$STATE/down"
  log "repaired by redeploying $SHA"
  send_mail "Gray Yachts: /sell went down — fixed automatically" \
"The landing page at $URL went down and has been repaired.

What was wrong : $REASON
What I did     : rebuilt from the production branch and redeployed
Deployed       : $SHA
Status now     : healthy, leads being captured again

This is almost always caused by a deploy made from a checkout that
predates the landing page — the deploy succeeds and quietly removes
/sell. Rebasing that branch onto main stops it recurring.

-- automated watchdog, runs every 10 minutes"
else
  # Don't email on every 10-minute tick while it stays broken.
  touch "$STATE/down"
  if [ ! -f "$STATE/notified" ] || [ "$(find "$STATE/notified" -mmin +60 2>/dev/null)" ]; then
    touch "$STATE/notified"
    log "REPAIR FAILED (rc=$DEPLOY_RC)"
    send_mail "Gray Yachts: /sell is DOWN and auto-repair failed" \
"The landing page at $URL is down and the automatic repair did not fix it.

What was wrong    : $REASON
Still wrong after : $REASON2
Deploy exit code  : $DEPLOY_RC
Ref deployed      : $SHA

Do not run ads to this page until it is back.

Last 40 lines of the deploy:
$(printf '%s' "$OUT" | tail -40)

-- automated watchdog, runs every 10 minutes"
  else
    log "still down; alert suppressed (already emailed within the hour)"
  fi
fi
