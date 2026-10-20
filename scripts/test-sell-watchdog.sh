#!/bin/bash
# End-to-end test of scripts/sell-watchdog.sh WITHOUT touching production.
#
#   a) healthy  — real /sell, expect "ok", no email
#   b) outage   — a URL that 404s, dry run: expect DOWN, a repair *planned*
#                 (never executed), and ONE "[TEST] ... DOWN" email
#   c) recovery — real /sell again with the same state: expect "recovered"
#                 and ONE "[TEST] ... back up" email
#
# State lives in a temp dir, so the launchd job's real state is untouched.
# Note: every check (like the real job) POSTs "{}" to /api/valuation, which
# the route rejects with 400 before storing or emailing anything.
#
# Usage: scripts/test-sell-watchdog.sh        (sends 2 test emails to Connor)
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
WD="$HERE/sell-watchdog.sh"
STATE_DIR="$(mktemp -d -t sell-watchdog-test)"
trap 'rm -rf "$STATE_DIR"' EXIT

export WATCHDOG_STATE_DIR="$STATE_DIR"
export WATCHDOG_DRY_RUN=1
export WATCHDOG_ALERT_SUBJECT_PREFIX="[TEST] "
export WATCHDOG_REPAIR_WAIT=0

FAIL=0
EMAILS=0
run() {  # name, "pattern1|||pattern2...", extra env...
  local name="$1" wants="$2"; shift 2
  echo "── $name"
  local out; out="$(env "$@" /bin/bash "$WD" 2>&1)"; local rc=$?
  printf '%s\n' "$out" | sed 's/^/   /'
  echo "   exit $rc"
  local want ok=1
  while IFS= read -r want; do
    printf '%s\n' "$out" | grep -Eq -- "$want" || { echo "   FAIL (missing /$want/)"; ok=0; FAIL=1; }
  done < <(printf '%s' "$wants" | awk 'BEGIN{RS="[|][|][|]"} {print}')
  [ "$ok" = 1 ] && echo "   PASS"
  # exactly as many emails as expected
  local n; n="$(printf '%s\n' "$out" | grep -c 'emailed "' || true)"
  echo "   emails sent: $n"
  EMAILS="$n"
}

run "a) healthy"  '  ok$'
[ "$EMAILS" = 0 ] || { echo "   FAIL: healthy run sent email"; FAIL=1; }
[ -f "$STATE_DIR/down" ] && { echo "   FAIL: down flag set after healthy run"; FAIL=1; }

run "b) outage (dry run)" 'DOWN: http 404|||DRY RUN: repair planned|||REPAIR FAILED|||emailed "\[TEST\] Gray Yachts: /sell is DOWN' \
    WATCHDOG_URL="https://grayyachts.com/__watchdog_test_404"
[ "$EMAILS" = 1 ] || { echo "   FAIL: expected exactly 1 email"; FAIL=1; }
[ -f "$STATE_DIR/down" ] || { echo "   FAIL: down flag not set after outage"; FAIL=1; }

run "c) recovery" 'recovered|||emailed "\[TEST\] Gray Yachts: /sell is back up'
[ "$EMAILS" = 1 ] || { echo "   FAIL: expected exactly 1 email"; FAIL=1; }
[ -f "$STATE_DIR/down" ] && { echo "   FAIL: down flag still set after recovery"; FAIL=1; }

[ "$FAIL" = 0 ] && echo "ALL PASS" || echo "SOME TESTS FAILED"
exit "$FAIL"
