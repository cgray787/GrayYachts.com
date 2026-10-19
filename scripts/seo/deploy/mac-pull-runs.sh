#!/bin/bash
# Pull the SEO agent's daily reports and drafts from the VPS into the Mac folder Connor reads.
# Since 2026-10-18 the agent runs on the VPS, where runs/ is root-only and nothing notifies on success.
# Installed copy: ~/Library/Scripts/grayyachts-seo-pull.sh (outside ~/Desktop: launchd + macOS TCC).
# Launchd: ~/Library/LaunchAgents/com.grayyachts.seo-runs-pull.plist (hourly + at login).
set -euo pipefail
HOST=root@45.132.242.109
SRC=/opt/grayyachts-automation/private/seo-editorial/runs/
DEST="$HOME/Library/Application Support/GrayYachts/seo-editorial/runs"
SEEN="$HOME/Library/Application Support/GrayYachts/seo-editorial/.pulled-drafts"
mkdir -p "$DEST"; touch "$SEEN"
/usr/bin/rsync -a -e "/usr/bin/ssh -o BatchMode=yes -o ConnectTimeout=20" "$HOST:$SRC" "$DEST/"
# Notify once per run that produced a draft.
for f in "$DEST"/*.json; do
  day=$(basename "$f" .json)
  grep -qx "$day" "$SEEN" && continue
  title=$(/usr/bin/python3 -c 'import json,sys;d=json.load(open(sys.argv[1])).get("draft");print(d["title"] if d else "")' "$f" 2>/dev/null || true)
  echo "$day" >> "$SEEN"
  [ -n "$title" ] || continue
  /usr/bin/osascript -e "display notification \"$(printf %s "$title" | tr -d '"\\')\" with title \"Gray Yachts SEO draft ready ($day)\" subtitle \"Review: runs/$day.md\"" || true
done
echo "$(date '+%F %T') pulled $(ls "$DEST" | wc -l | tr -d ' ') files"
