# SEO editorial reliability repair

The October23 run returned every topic unverified and reported insufficient web-service credits, but the runner recorded success. The repair rejects missing, duplicate and wholly unverified research, including credit failures in critique. It also preserves a saved draft across Markdown/state-write failures, archives replaced daily records, scans past same-day drafts, and parses the final schema-valid Hermes response rather than the first diagnostic JSON object.

## Research modes

`GRAYYACHTS_SEO_RESEARCH_MODE=web` retains the existing Hermes WebSearch/WebFetch route.

`GRAYYACHTS_SEO_RESEARCH_MODE=official_sources` uses bounded direct HTTPS reads of the configured official organizer/manufacturer URLs. The model receives retrieved source text with dates and hashes, and Hermes is invoked with the empty `none` toolset. The installed Hermes tool resolver must be checked to expose zero tools for that set before enabling this mode. It does not use Firecrawl credits or create a new paid account. The existing model account remains in use.

The fallback is narrower than broad web search. It cannot claim that it searched for newer announcements elsewhere. Successful research statements and article citations must use retrieved snapshot URLs. Failed reads remain unverified. Public source snapshots are retained under state `sources/`; old daily records and attempts are retained under `attempts/`. No automatic publication is added.

## Deployment

Use the existing SEO deployment branch, not the public website production branch. Review the exact pushed source first. Claim the SEO system, stop the timer only for the short replacement window, acquire the existing run.lock, back up current scripts and state, upload to a staging directory, verify SHA256, then replace the reviewed files atomically. Set only the SEO job's research-mode environment variable; preserve all credentials and global Hermes settings. Restart the existing timer and verify next run and actual outputs. Never overwrite old evidence without retaining it.

## Verification

49 unit tests currently pass, including diagnostic JSON handling, lost-draft recovery, false-success retry, missing topic coverage, exact wording for new copy, no-tools invocation and private-URL rejection. The original37 regression tests remain covered. Direct HTTPS preflight on the VPS retrieved the public FLIBS, Sirena and Aquila pages with HTTP200. A real full corrected run remains a deployment verification step; do not claim it from unit tests.

Sources: existing daily state/run records, current runner/test code, installed Hermes CLI help and tool dispatcher; official OpenAI noninteractive CLI documentation; official Hermes Web Search & Extract documentation. No credential values or customer records are needed for this repair.
