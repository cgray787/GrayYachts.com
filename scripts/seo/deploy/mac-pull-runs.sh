#!/bin/bash
# Pull the SEO agent's daily reports and drafts from the VPS into the Mac folder Connor reads.
# Since 2026-10-18 the agent runs on the VPS, where runs/ is root-only and nothing notifies on success.
# Installed copy: ~/Library/Scripts/grayyachts-seo-pull.sh (outside ~/Desktop: launchd + macOS TCC).
# Launchd: ~/Library/LaunchAgents/com.grayyachts.seo-runs-pull.plist (hourly at :20, catches up on wake, and at login).
set -euo pipefail
HOST=root@45.132.242.109
SRC=/opt/grayyachts-automation/private/seo-editorial/runs/
# GY_SEO_* overrides exist only for test-mac-pull-runs.sh (offline rsync/osascript shims).
DEST=${GY_SEO_DEST:-"$HOME/Library/Application Support/GrayYachts/seo-editorial/runs"}
SEEN=${GY_SEO_SEEN:-"$HOME/Library/Application Support/GrayYachts/seo-editorial/.pulled-drafts"}
RSYNC=${GY_SEO_RSYNC:-/usr/bin/rsync}
OSASCRIPT=${GY_SEO_OSASCRIPT:-/usr/bin/osascript}
mkdir -p "$DEST"; touch "$SEEN"
"$RSYNC" -a -e "/usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=20" "$HOST:$SRC" "$DEST/"
# Notify once per day that produced a draft.
for f in "$DEST"/*.json; do
  day=$(basename "$f" .json)
  grep -qx "$day" "$SEEN" && continue
  title=$(/usr/bin/python3 -c 'import json,sys;d=json.load(open(sys.argv[1])).get("draft");print(d["title"] if d else "")' "$f" 2>/dev/null || true)
  # Mark a day seen only once it has a draft: a research-only day can be rerun later with one.
  [ -n "$title" ] || continue
  # Mark the day seen only after the notification succeeded; a failure is logged and retried next pull
  # (before 2026-10-23 the marker was appended first and the osascript error was discarded).
  if "$OSASCRIPT" -e "display notification \"$(printf %s "$title" | tr -d '"\\')\" with title \"Gray Yachts SEO draft ready ($day)\" subtitle \"Review: runs/$day.md\""; then
    echo "$day" >> "$SEEN"
  else
    echo "$(date '+%F %T') notification FAILED for $day (exit $?); will retry on the next pull" >&2
  fi
done
echo "$(date '+%F %T') pulled $(ls "$DEST" | wc -l | tr -d ' ') files"
