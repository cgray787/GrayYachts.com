#!/usr/bin/env node
// CLI: ingests Connor's exported originals from a VPS inbox directory into
// the website's private owner-photos library over HTTPS, then moves
// processed originals to a "done" directory. Nothing here talks to the Mac;
// it only reads local files on the VPS and calls the already-built API.
//
// Usage:
//   node scripts/owner-photos/ingest.mjs --inbox <dir> [--done <dir>] [--dry-run] [--api https://grayyachts.com]
import { readFile, readdir, rename, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, basename, dirname } from 'node:path';
import { processImage, classifyDedup } from './lib.mjs';

const IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.heic', '.webp']);
const MAX_ATTEMPTS = 3;
const DEFAULT_API = 'https://grayyachts.com';

function parseArgs(argv) {
  const args = { inbox: null, done: null, dryRun: false, api: DEFAULT_API };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--inbox') args.inbox = argv[++i];
    else if (arg === '--done') args.done = argv[++i];
    else if (arg === '--dry-run') args.dryRun = true;
    else if (arg === '--api') args.api = argv[++i];
    else throw new Error(`Unknown argument: ${arg}`);
  }
  if (!args.inbox) throw new Error('--inbox <dir> is required');
  if (!args.done) args.done = join(args.inbox, '..', 'done');
  return args;
}

/** Resolve the bearer secret from env var, falling back to the VPS-local file. Never logged. */
async function resolveSecret() {
  if (process.env.NEWSLETTER_AUTOMATION_SECRET) {
    return process.env.NEWSLETTER_AUTOMATION_SECRET.trim();
  }
  const secretPath = join(homedir(), '.config', 'grayyachts', 'newsletter-automation-secret');
  const raw = await readFile(secretPath, 'utf8');
  return raw.trim();
}

async function listImageFiles(inboxDir) {
  const entries = await readdir(inboxDir, { withFileTypes: true });
  return entries
    .filter((e) => e.isFile())
    .map((e) => e.name)
    .filter((name) => IMAGE_EXTENSIONS.has(extOf(name)))
    .sort();
}

function extOf(name) {
  const idx = name.lastIndexOf('.');
  return idx === -1 ? '' : name.slice(idx).toLowerCase();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** GET the current server-side hash list for dedup. */
async function fetchServerHashes(api, secret) {
  const response = await fetch(`${api}/api/newsletter/owner-photos`, {
    method: 'GET',
    headers: { authorization: `Bearer ${secret}` },
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch existing owner-photos (HTTP ${response.status})`);
  }
  const body = await response.json();
  const hashes = Array.isArray(body.hashes) ? body.hashes : [];
  return {
    knownIds: new Set(hashes.map((h) => h.id)),
    knownPhashes: hashes.map((h) => h.phash),
  };
}

/** Upload one processed photo, retrying on 429/5xx with backoff honoring Retry-After. */
async function uploadWithRetry(api, secret, processed) {
  const headers = {
    'content-type': 'image/jpeg',
    authorization: `Bearer ${secret}`,
    'x-owner-phash': processed.phash,
  };
  if (processed.width != null) headers['x-owner-width'] = String(processed.width);
  if (processed.height != null) headers['x-owner-height'] = String(processed.height);
  if (processed.takenOn) headers['x-owner-taken-on'] = processed.takenOn;

  let lastError = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const response = await fetch(`${api}/api/newsletter/owner-photos`, {
        method: 'POST',
        headers,
        body: processed.bytes,
      });

      if (response.ok) {
        const body = await response.json();
        return { ok: true, body };
      }

      const retryable = response.status === 429 || response.status >= 500;
      if (!retryable || attempt === MAX_ATTEMPTS) {
        let errorBody = null;
        try {
          errorBody = await response.json();
        } catch {
          // ignore non-JSON error bodies
        }
        return {
          ok: false,
          status: response.status,
          error: errorBody?.error || `HTTP ${response.status}`,
        };
      }

      const retryAfterHeader = response.headers.get('retry-after');
      const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : null;
      const backoffMs = Number.isFinite(retryAfterSeconds) && retryAfterSeconds > 0
        ? retryAfterSeconds * 1000
        : 2 ** (attempt - 1) * 1000; // 1s, 2s, ...
      await sleep(backoffMs);
    } catch (networkError) {
      lastError = networkError;
      if (attempt === MAX_ATTEMPTS) {
        return { ok: false, status: null, error: `network error: ${networkError.message}` };
      }
      await sleep(2 ** (attempt - 1) * 1000);
    }
  }
  return { ok: false, status: null, error: lastError ? lastError.message : 'unknown failure' };
}

async function ensureDir(dir) {
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

async function moveToDone(filePath, doneDir) {
  await ensureDir(doneDir);
  const dest = join(doneDir, basename(filePath));
  await rename(filePath, dest);
}

export async function run(argv) {
  const args = parseArgs(argv);
  const secret = await resolveSecret();

  const files = await listImageFiles(args.inbox);

  const summary = {
    uploaded: [],
    duplicate: [],
    near_duplicate: [],
    failed: [],
  };

  const { knownIds, knownPhashes } = await fetchServerHashes(args.api, secret);
  const batchPhashes = [];

  for (const fileName of files) {
    const filePath = join(args.inbox, fileName);
    try {
      const inputBuffer = await readFile(filePath);
      const processed = await processImage(inputBuffer);

      const classification = classifyDedup({
        sha256: processed.sha256,
        phash: processed.phash,
        knownIds,
        knownPhashes,
        batchPhashes,
      });

      if (classification === 'duplicate') {
        summary.duplicate.push({ file: fileName, id: processed.sha256 });
        await moveToDone(filePath, args.done);
        continue;
      }

      if (classification === 'near_duplicate') {
        summary.near_duplicate.push({ file: fileName, phash: processed.phash });
        batchPhashes.push(processed.phash);
        await moveToDone(filePath, args.done);
        continue;
      }

      // classification === 'ok': clean candidate for upload.
      batchPhashes.push(processed.phash);

      if (args.dryRun) {
        summary.uploaded.push({
          file: fileName,
          id: processed.sha256,
          dryRun: true,
          width: processed.width,
          height: processed.height,
          takenOn: processed.takenOn,
        });
        // Dry run: do not move originals, since nothing was actually uploaded.
        continue;
      }

      const result = await uploadWithRetry(args.api, secret, processed);
      if (result.ok) {
        summary.uploaded.push({
          file: fileName,
          id: result.body.id,
          url: result.body.url,
        });
        await moveToDone(filePath, args.done);
      } else {
        summary.failed.push({ file: fileName, status: result.status, error: result.error });
      }
    } catch (err) {
      summary.failed.push({ file: fileName, error: err.message });
    }
  }

  const output = {
    uploaded: summary.uploaded.length,
    duplicate: summary.duplicate.length,
    near_duplicate: summary.near_duplicate.length,
    failed: summary.failed.length,
    details: summary,
  };

  console.log(JSON.stringify(output, null, 2));
  return output;
}

const isMain = process.argv[1] && import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  run(process.argv.slice(2))
    .then((output) => {
      process.exit(output.failed > 0 ? 1 : 0);
    })
    .catch((err) => {
      console.error(`Fatal error: ${err.message}`);
      process.exit(1);
    });
}
