#!/usr/bin/env bash
# Push the Hermes newsletter files in this folder to the VPS and verify by hash.
# The repo is the source of truth; run after any change here. `--check` only compares.
set -euo pipefail
cd "$(dirname "$0")"
HOST=root@45.132.242.109
FILES=("newsletter.py:/root/.hermes/scripts/grayyachts-newsletter.py"
       "show_calendar.py:/root/.hermes/scripts/show_calendar.py"
       "BRIEF.md:/root/.hermes/workspaces/grayyachts-newsletter/BRIEF.md")
drift=0
for pair in "${FILES[@]}"; do
  local_file=${pair%%:*}; remote=${pair#*:}
  [[ ${1:-} == --check ]] || scp -q "$local_file" "$HOST:$remote"
  a=$(shasum -a 256 < "$local_file" | cut -d' ' -f1)
  b=$(ssh "$HOST" "sha256sum '$remote'" | cut -d' ' -f1)
  if [[ $a == "$b" ]]; then echo "ok     $local_file"; else echo "DRIFT  $local_file -> $remote"; drift=1; fi
done
[[ $drift == 0 ]] || exit 1
# End to end: build the real prompt from live data on the VPS (2026-10-19 the prompt outgrew the
# 128 KB argument limit and every run crashed before Hermes started).
ssh "$HOST" "cd /root/.hermes/scripts && python3 grayyachts-newsletter.py preflight" || { echo "PREFLIGHT FAILED"; exit 1; }
