#!/usr/bin/env bash
# Push the Hermes newsletter files in this folder to the VPS and verify by hash.
# The repo is the source of truth; run after any change here. `--check` only compares.
# Each file is copied to <remote>.tmp.$$ first, hashed remotely, and only then moved into place
# under the newsletter's own run lock, so a scheduled run never reads a half-written file and a
# bad transfer never replaces a working copy (Codex review 2026-10-23).
set -euo pipefail
cd "$(dirname "$0")"
HOST=root@45.132.242.109
LOCK=/root/.hermes/workspaces/grayyachts-newsletter/run.lock
FILES=("newsletter.py:/root/.hermes/scripts/grayyachts-newsletter.py"
       "show_calendar.py:/root/.hermes/scripts/show_calendar.py"
       "BRIEF.md:/root/.hermes/workspaces/grayyachts-newsletter/BRIEF.md")
drift=0
for pair in "${FILES[@]}"; do
  local_file=${pair%%:*}; remote=${pair#*:}
  a=$(shasum -a 256 < "$local_file" | cut -d' ' -f1)
  if [[ ${1:-} != --check ]]; then
    tmp="$remote.tmp.$$"
    scp -q "$local_file" "$HOST:$tmp"
    t=$(ssh "$HOST" "sha256sum '$tmp'" | cut -d' ' -f1)
    if [[ $a != "$t" ]]; then
      ssh "$HOST" "rm -f '$tmp'"
      echo "HASH MISMATCH after transfer: $local_file -> $tmp (local $a, remote $t); live file untouched"
      exit 1
    fi
    # Wait up to 2 minutes for a running edition to finish before swapping the file it imports.
    ssh "$HOST" "flock -w 120 '$LOCK' mv -f '$tmp' '$remote'" || { ssh "$HOST" "rm -f '$tmp'"; echo "LOCKED: could not take $LOCK; $remote unchanged"; exit 1; }
  fi
  b=$(ssh "$HOST" "sha256sum '$remote'" | cut -d' ' -f1)
  if [[ $a == "$b" ]]; then echo "ok     $local_file"; else echo "DRIFT  $local_file -> $remote"; drift=1; fi
done
[[ $drift == 0 ]] || exit 1
# End to end: build the real prompt from live data on the VPS (2026-10-19 the prompt outgrew the
# 128 KB argument limit and every run crashed before Hermes started).
ssh "$HOST" "cd /root/.hermes/scripts && python3 grayyachts-newsletter.py preflight" || { echo "PREFLIGHT FAILED"; exit 1; }
