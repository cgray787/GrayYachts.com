#!/usr/bin/env bash
# Offline test for sync.sh: ssh/scp/flock/sha256sum are shimmed into a temp "VPS" root. No network.
# Checks that a live file is only replaced under the run lock after the transferred copy's hash
# matches, and that a corrupted transfer leaves the live file untouched and exits 1.
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd)
T=$(mktemp -d); trap 'rm -rf "$T"' EXIT
export FAKE_ROOT="$T/vps" SHIM_LOG="$T/calls.log"
mkdir -p "$T/bin" "$FAKE_ROOT/root/.hermes/scripts" "$FAKE_ROOT/root/.hermes/workspaces/grayyachts-newsletter"
cat > "$T/bin/scp" <<'S'
#!/usr/bin/env bash
src=${*: -2:1}; dst=${*: -1}; dst=${dst#*:}
echo "scp $src -> $dst" >> "$SHIM_LOG"
cp "$src" "$FAKE_ROOT$dst"
[[ ${CORRUPT:-0} == 1 ]] && printf 'X' >> "$FAKE_ROOT$dst"
exit 0
S
cat > "$T/bin/ssh" <<'S'
#!/usr/bin/env bash
cmd=${*: -1}
echo "ssh $cmd" >> "$SHIM_LOG"
case "$cmd" in *preflight*) echo '{"problems": []}'; exit 0;; esac
PATH="$FAKE_ROOT/bin:$PATH" bash -c "$(printf %s "$cmd" | sed "s#/root/#$FAKE_ROOT/root/#g")"
S
mkdir -p "$FAKE_ROOT/bin"
cat > "$FAKE_ROOT/bin/sha256sum" <<'S'
#!/usr/bin/env bash
for f in "$@"; do printf '%s  %s\n' "$(shasum -a 256 < "$f" | cut -d' ' -f1)" "$f"; done
S
cat > "$FAKE_ROOT/bin/flock" <<'S'
#!/usr/bin/env bash
echo "flock $*" >> "$SHIM_LOG"
while [[ $1 == -* ]]; do [[ $1 == -w ]] && shift; shift; done
lock=$1; shift; [[ -e $lock ]] || { echo "flock: lock file missing: $lock" >&2; exit 2; }
exec "$@"
S
chmod +x "$T/bin/"* "$FAKE_ROOT/bin/"*
export PATH="$T/bin:$PATH"
# Seed a stale live copy and the run lock the scheduled job creates.
printf 'stale\n' > "$FAKE_ROOT/root/.hermes/scripts/grayyachts-newsletter.py"
: > "$FAKE_ROOT/root/.hermes/workspaces/grayyachts-newsletter/run.lock"
fail(){ echo "FAIL: $*" >&2; exit 1; }

echo "--- case 1: corrupted transfer must not touch the live file"
if CORRUPT=1 bash "$HERE/sync.sh" > "$T/out1" 2>&1; then fail "sync.sh exited 0 on a corrupted transfer"; fi
[[ $(cat "$FAKE_ROOT/root/.hermes/scripts/grayyachts-newsletter.py") == stale ]] || fail "live file was overwritten before verification"
ls "$FAKE_ROOT/root/.hermes/scripts/" | grep -q '\.tmp\.' && fail "temp file left behind after mismatch"
grep -q "MISMATCH" "$T/out1" || fail "mismatch not reported: $(cat "$T/out1")"

echo "--- case 2: clean transfer is verified then moved into place under the run lock"
: > "$SHIM_LOG"
bash "$HERE/sync.sh" > "$T/out2" 2>&1 || fail "sync.sh failed on a clean transfer: $(cat "$T/out2")"
cmp -s "$HERE/newsletter.py" "$FAKE_ROOT/root/.hermes/scripts/grayyachts-newsletter.py" || fail "live file not updated"
cmp -s "$HERE/BRIEF.md" "$FAKE_ROOT/root/.hermes/workspaces/grayyachts-newsletter/BRIEF.md" || fail "BRIEF.md not updated"
grep -q "^scp .* -> /root/.hermes/scripts/grayyachts-newsletter.py.tmp\." "$SHIM_LOG" || fail "scp did not write to a temp path: $(grep scp "$SHIM_LOG")"
grep -q "^flock .*grayyachts-newsletter/run.lock mv " "$SHIM_LOG" || fail "mv was not run under flock on run.lock: $(grep flock "$SHIM_LOG" || echo none)"
grep -c '^ok ' "$T/out2" | grep -qx 3 || fail "expected 3 ok lines: $(cat "$T/out2")"

echo "--- case 3: --check never copies"
: > "$SHIM_LOG"
bash "$HERE/sync.sh" --check > "$T/out3" 2>&1 || true
grep -q '^scp' "$SHIM_LOG" && fail "--check ran scp"
echo "PASS: sync.sh offline tests"
