#!/bin/bash
# Offline test for mac-pull-runs.sh: rsync and osascript are shimmed. A day must be marked seen
# only after the notification succeeds, so a failed notification is retried on the next pull and
# the failure is written to stderr (Codex review 2026-10-23).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
mkdir -p "$T/src" "$T/bin"
printf '{"date":"2026-10-23","draft":{"title":"Test draft"}}' > "$T/src/2026-10-23.json"
printf '{"date":"2026-10-22","draft":null}' > "$T/src/2026-10-22.json"
cat > "$T/bin/rsync" <<'S'
#!/bin/bash
cp "$GY_TEST_SRC"/* "${@: -1}"
S
cat > "$T/bin/osascript" <<'S'
#!/bin/bash
n=$(( $(cat "$GY_TEST_COUNTER" 2>/dev/null || echo 0) + 1 )); echo "$n" > "$GY_TEST_COUNTER"
echo "osascript $*" >> "$GY_TEST_LOG"
[ "$n" -ge 2 ] || { echo "osascript: notification center unavailable (-1708)" >&2; exit 1; }
S
chmod +x "$T/bin/"*
export GY_TEST_SRC="$T/src" GY_TEST_COUNTER="$T/count" GY_TEST_LOG="$T/osa.log"
export GY_SEO_DEST="$T/dest" GY_SEO_SEEN="$T/seen" GY_SEO_RSYNC="$T/bin/rsync" GY_SEO_OSASCRIPT="$T/bin/osascript"
fail(){ echo "FAIL: $*" >&2; exit 1; }

echo "--- pull 1: notification fails"
bash "$HERE/mac-pull-runs.sh" > "$T/out1" 2> "$T/err1" || fail "pull 1 exited non-zero: $(cat "$T/err1")"
grep -qx 2026-10-23 "$T/seen" && fail "day marked seen although the notification failed"
grep -q "2026-10-23" "$T/err1" || fail "notification failure not written to stderr: $(cat "$T/err1")"
grep -q "(exit 1)" "$T/err1" || fail "osascript exit status not logged (expected exit 1): $(cat "$T/err1")"
grep -q "pulled 2 files" "$T/out1" || fail "pull line missing: $(cat "$T/out1")"

echo "--- pull 2: notification succeeds"
bash "$HERE/mac-pull-runs.sh" > "$T/out2" 2> "$T/err2" || fail "pull 2 exited non-zero: $(cat "$T/err2")"
grep -qx 2026-10-23 "$T/seen" || fail "day not marked seen after a successful notification"
grep -qx 2026-10-22 "$T/seen" && fail "research-only day must not be marked seen"
[ "$(cat "$T/count")" = 2 ] || fail "expected exactly 2 osascript calls, got $(cat "$T/count")"
[ -s "$T/err2" ] && fail "unexpected stderr on success: $(cat "$T/err2")"

echo "--- pull 3: no repeat notification"
bash "$HERE/mac-pull-runs.sh" > /dev/null 2>&1 || fail "pull 3 exited non-zero"
[ "$(cat "$T/count")" = 2 ] || fail "notified again for a seen day"
echo "PASS: mac-pull-runs.sh offline tests"
