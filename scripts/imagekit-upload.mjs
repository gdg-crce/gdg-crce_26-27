/**
 * Upload the site's web assets to ImageKit, mirroring public/ under /gdg-crce.
 *
 * The ImageKit MCP server's sandbox cannot read local files, so uploads run
 * from here. Needs the private API key in .env.local:
 *
 *   IMAGEKIT_PRIVATE_KEY=private_xxxxxxxx
 *
 * Usage:
 *   node scripts/imagekit-upload.mjs            # upload everything in the manifest
 *   node scripts/imagekit-upload.mjs --dry-run  # list what would be uploaded
 *
 * Re-running is safe: overwriteFile keeps the same filePath (and therefore the
 * same URL), so the site does not need re-wiring after a re-upload.
 *
 * Deliberately dependency-free and written against the node:https/Buffer API
 * rather than fetch/FormData — the node on PATH here is v14, which has neither.
 */

import { readFile, stat, writeFile } from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC_DIR = path.join(ROOT, 'public');
const MANIFEST = path.join(ROOT, 'scripts', 'imagekit-manifest.json');
const RESULTS = path.join(ROOT, 'scripts', 'imagekit-uploaded.json');
const IK_FOLDER_ROOT = '/gdg-crce';

const DRY_RUN = process.argv.includes('--dry-run');

/** Minimal .env.local reader — avoids pulling in a dotenv dependency. */
function loadEnvLocal() {
  const envPath = path.join(ROOT, '.env.local');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)$/.exec(line);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const MIME = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
  '.mp3': 'audio/mpeg',
};

const mimeFor = (f) => MIME[path.extname(f).toLowerCase()] ?? 'application/octet-stream';

function buildMultipart(fields, file) {
  const boundary = '----imagekit' + Math.random().toString(16).slice(2) + Date.now().toString(16);
  const parts = [];
  for (const [name, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${name}"\r\n\r\n${value}\r\n`),
    );
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${file.filename}"\r\n` +
        `Content-Type: ${file.contentType}\r\n\r\n`,
    ),
  );
  parts.push(file.data);
  parts.push(Buffer.from(`\r\n--${boundary}--\r\n`));
  return { boundary, body: Buffer.concat(parts) };
}

function post(body, boundary, auth) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        method: 'POST',
        hostname: 'upload.imagekit.io',
        path: '/api/v1/files/upload',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': `multipart/form-data; boundary=${boundary}`,
          'Content-Length': body.length,
        },
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8');
          let json;
          try {
            json = JSON.parse(text);
          } catch {
            json = { raw: text };
          }
          if (res.statusCode >= 200 && res.statusCode < 300) resolve(json);
          else reject(new Error(`${res.statusCode} ${JSON.stringify(json)}`));
        });
      },
    );
    req.on('error', reject);
    req.end(body);
  });
}

/**
 * Manifest entries are either a plain path (remote mirrors local) or
 * `{ local, remoteDir }` for the cases where they cannot match — ImageKit
 * rejects a `folder` containing a space, so `record player/` lands as
 * `record-player/`.
 */
function normalise(entry) {
  if (typeof entry === 'string') {
    const dir = path.posix.dirname(entry);
    return { local: entry, remoteDir: dir === '.' ? '' : dir };
  }
  return { local: entry.local, remoteDir: entry.remoteDir ?? '' };
}

async function uploadOne(entry, auth) {
  const data = await readFile(path.join(PUBLIC_DIR, entry.local));
  const fileName = path.posix.basename(entry.local.split(path.sep).join('/'));

  const { boundary, body } = buildMultipart(
    {
      fileName,
      folder: entry.remoteDir ? `${IK_FOLDER_ROOT}/${entry.remoteDir}` : IK_FOLDER_ROOT,
      // Exact filenames are what the source rewrites depend on — never let
      // ImageKit append its random suffix.
      useUniqueFileName: 'false',
      overwriteFile: 'true',
    },
    { filename: fileName, contentType: mimeFor(fileName), data },
  );
  return post(body, boundary, auth);
}

async function main() {
  loadEnvLocal();

  const manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  const onlyIdx = process.argv.indexOf('--only');
  const only = onlyIdx !== -1 ? process.argv[onlyIdx + 1] : null;

  const files = manifest.files.map(normalise).filter((e) => !only || e.local.includes(only));
  if (only) console.log(`--only "${only}" matched ${files.length} file(s)`);

  let total = 0;
  const missing = [];
  for (const f of files) {
    try {
      total += (await stat(path.join(PUBLIC_DIR, f.local))).size;
    } catch {
      missing.push(f.local);
    }
  }
  if (missing.length) {
    console.error(`Missing locally (${missing.length}):`);
    for (const m of missing) console.error(`  ${m}`);
    process.exit(1);
  }

  console.log(`${files.length} files, ${(total / 1024 / 1024).toFixed(1)} MB -> ${IK_FOLDER_ROOT}`);
  if (DRY_RUN) {
    for (const f of files) console.log(`  ${f.local}`);
    return;
  }

  const key = process.env.IMAGEKIT_PRIVATE_KEY;
  if (!key) {
    console.error('IMAGEKIT_PRIVATE_KEY is not set (put it in .env.local).');
    process.exit(1);
  }
  const auth = Buffer.from(`${key}:`).toString('base64');

  const ok = [];
  const failed = [];
  // Sequential: a clean per-file log matters more than wall-clock time on a
  // one-off migration, and it keeps well clear of upload rate limits.
  for (const [i, f] of files.entries()) {
    const label = `[${String(i + 1).padStart(2)}/${files.length}] ${f.local}`;
    try {
      const r = await uploadOne(f, auth);
      ok.push({ local: f.local, filePath: r.filePath, url: r.url });
      console.log(`${label} -> ${r.filePath}`);
    } catch (e) {
      failed.push({ local: f.local, error: String(e.message ?? e) });
      console.error(`${label} FAILED: ${e.message ?? e}`);
    }
  }

  // Merge, so a --only run tops up the record rather than truncating it.
  let prior = { uploaded: [], failed: [] };
  if (existsSync(RESULTS)) {
    try {
      prior = JSON.parse(readFileSync(RESULTS, 'utf8'));
    } catch {
      /* corrupt or absent — start clean */
    }
  }
  const touched = new Set(files.map((f) => f.local));
  const merged = {
    uploaded: [...prior.uploaded.filter((u) => !touched.has(u.local)), ...ok].sort((a, b) =>
      a.local.localeCompare(b.local),
    ),
    failed: [...prior.failed.filter((u) => !touched.has(u.local)), ...failed],
  };
  await writeFile(RESULTS, JSON.stringify(merged, null, 2) + '\n');
  console.log(`\nuploaded ${ok.length}, failed ${failed.length} (results -> scripts/imagekit-uploaded.json)`);
  if (failed.length) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
