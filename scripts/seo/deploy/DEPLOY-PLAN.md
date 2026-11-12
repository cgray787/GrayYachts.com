# Deploy plan: no-draft fix (branch `fix/seo-agent-silent-no-draft`)

Not executed. These are the exact steps to run on the VPS (45.132.242.109) later,
with Connor's yes, once this branch is reviewed and merged. `/opt/grayyachts-seo`
is not a git checkout (see `DEPLOYED-MANIFEST.md`), so deployment is a file copy,
not a `git pull`.

## 0. Preconditions

- This branch's tests pass locally: `cd scripts/seo && python3 -m unittest test_editorial_loop test_reliability test_no_draft_fixes`.
- Connor has reviewed and approved widening research sources beyond each topic's
  official page (`content/seo/reputable-sources.json` is marked UNVERIFIED for
  reachability/robots and needs his sign-off before it drives live drafts).

## 1. Back up the current deployed state

```
ssh vps 'tar -czf /root/grayyachts-seo-backup-$(date +%Y%m%d%H%M).tar.gz \
  /opt/grayyachts-seo \
  /opt/grayyachts-automation/private/seo.env \
  /opt/grayyachts-automation/private/seo-editorial'
```

Confirm the archive exists and is non-empty before continuing.

## 2. Copy the changed files

Copy only the files this branch touched, preserving everything else byte for
byte (per `DEPLOYED-MANIFEST.md`):

```
scp scripts/seo/editorial_loop.py        vps:/opt/grayyachts-seo/scripts/seo/editorial_loop.py
scp scripts/seo/public_sources.py        vps:/opt/grayyachts-seo/scripts/seo/public_sources.py
scp scripts/seo/research-prompt.md       vps:/opt/grayyachts-seo/scripts/seo/research-prompt.md
scp scripts/seo/test_editorial_loop.py   vps:/opt/grayyachts-seo/scripts/seo/test_editorial_loop.py
scp scripts/seo/test_reliability.py      vps:/opt/grayyachts-seo/scripts/seo/test_reliability.py
scp scripts/seo/test_no_draft_fixes.py   vps:/opt/grayyachts-seo/scripts/seo/test_no_draft_fixes.py
scp content/seo/program.json             vps:/opt/grayyachts-seo/content/seo/program.json
scp content/seo/reputable-sources.json   vps:/opt/grayyachts-seo/content/seo/reputable-sources.json
```

`scripts/seo/deploy/seo.env.example` and `scripts/seo/deploy/DEPLOY-PLAN.md` are
documentation only; they do not need to exist under `/opt/grayyachts-seo`.

## 3. Run the test suite on the VPS, against the VPS Python

```
ssh vps 'cd /opt/grayyachts-seo/scripts/seo && python3 -m unittest test_editorial_loop test_reliability test_no_draft_fixes'
```

Do not continue past this step if anything fails.

## 4. Update the private env file

Edit `/opt/grayyachts-automation/private/seo.env` on the VPS (not in this repo):

```
GRAYYACHTS_SEO_RESEARCH_MODE=reputable_sources
```

Everything else in that file (`GRAYYACHTS_SEO_PROVIDER=hermes`, `GRAYYACHTS_SEO_STATE`,
`RESEND_API_KEY`) stays as is. See `scripts/seo/deploy/seo.env.example` for the full
list of variable names this branch adds, all optional with working defaults.

`systemctl daemon-reload` is **not** needed for this step — only the env file
content changed, not the unit or timer files.

## 5. Verify the login/auth health check before the next real run

```
ssh vps 'cd /opt/grayyachts-seo && python3 scripts/seo/editorial_loop.py check-auth'
```

Must print `{"ok": true, ...}` and exit 0. If it fails, fix the Hermes/Claude
CLI login on the VPS before proceeding — do not relax or skip this check.

## 6. Dry run

```
ssh vps 'cd /opt/grayyachts-seo && python3 scripts/seo/editorial_loop.py run --dry-run'
```

Confirm the printed JSON shows `"researchMode": "reputable_sources"` and
`"tools": []`, and that `mayWriteOneDraft` matches today's weekday.

## 7. Let the next scheduled timer run fire normally

No manual `run` is needed; `grayyachts-seo-editorial.timer` fires at 07:15
America/Los_Angeles. Check `scripts/seo/deploy/mac-pull-runs.sh`'s synced copy
of `runs/<date>.md` the next morning, and confirm no
"no draft today" alert email arrives on a day a draft was actually produced.

## Rollback

If anything misbehaves after step 4, 5 or 6:

1. Set `GRAYYACHTS_SEO_RESEARCH_MODE=official_sources` back in
   `/opt/grayyachts-automation/private/seo.env` (the fastest single-line revert;
   this does not require restoring any files).
2. If the code itself needs reverting, restore from the step 1 backup:
   ```
   ssh vps 'tar -xzf /root/grayyachts-seo-backup-<timestamp>.tar.gz -C /'
   ```
3. Re-run `check-auth` and `run --dry-run` after any rollback to confirm the
   restored state is healthy before leaving it for the next scheduled timer.

## E2BIG fix (2026-11-12)

`reputable_sources` mode fetched 13 snapshots (79,673 bytes of JSON) and the
resulting Hermes prompt was ~139,659 bytes. `invoke_agent()` passed that whole
prompt as a single argv string, over Linux's `MAX_ARG_STRLEN` (131072 bytes),
so `execve` failed with `[Errno 7] Argument list too long`. Fixed by sending
the prompt over stdin to the Hermes venv's own interpreter, and by bounding
the prompt itself (`build_prompt()`, `MAX_PROMPT_BYTES`) so it never gets that
large to begin with.

Only these files are deployed for this fix — not the full file list in step 2
above:

```
scp scripts/seo/editorial_loop.py        vps:/opt/grayyachts-seo/scripts/seo/editorial_loop.py
scp scripts/seo/test_prompt_size.py      vps:/opt/grayyachts-seo/scripts/seo/test_prompt_size.py
scp scripts/seo/test_no_draft_fixes.py   vps:/opt/grayyachts-seo/scripts/seo/test_no_draft_fixes.py
```

(`test_no_draft_fixes.py` only changed because one of its tests leaked a
mocked `subprocess.run` across the test session; no behavior it covers
changed.)

Run the test suite on the VPS exactly as in step 3 before trusting this.

**Rollback:** restore `scripts/seo/editorial_loop.py` from the step 1 backup
tarball rather than editing it live:

```
ssh vps 'tar -xzf /root/grayyachts-seo-backup-<timestamp>.tar.gz -C / opt/grayyachts-seo/scripts/seo/editorial_loop.py'
```

The test files are safe to leave in place either way; they do not run in
production.
