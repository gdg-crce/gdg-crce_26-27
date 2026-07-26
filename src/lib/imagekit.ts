/**
 * ImageKit asset URLs.
 *
 * `NEXT_PUBLIC_IMAGEKIT_URL` is the single switch. Set it (see .env.local) and
 * every asset below is served from the CDN with per-client format and quality
 * negotiation; unset it and everything falls back to local `public/`, so the
 * site still runs with no CDN at all. Keep that fallback working — it is the
 * escape hatch if ImageKit is ever unreachable.
 *
 * Three.js textures (`textures/**`) and `.glb` models are deliberately NOT
 * routed through here. They are art- and performance-tuned, and remote loading
 * would add CORS and load-timing risk to the one part of the site that is most
 * sensitive to both.
 *
 * Re-uploading via `node scripts/imagekit-upload.mjs` preserves paths, so URLs
 * built here stay valid across re-bakes of the source images.
 */

const BASE = (process.env.NEXT_PUBLIC_IMAGEKIT_URL ?? '').replace(/\/+$/, '');

/**
 * Local path -> remote path, for the files where ImageKit's own name handling
 * diverged from ours. It rewrites a space and an `&` in a filename to `_`, and
 * rejects a folder name containing a space outright. These five are the entire
 * set — `scripts/imagekit-uploaded.json` is the authority.
 */
const REMOTE_PATH: Record<string, string> = {
  '/whatwedo/image copy.png': '/whatwedo/image_copy.png',
  '/whatwedo/mobile/ml&andro.png': '/whatwedo/mobile/ml_andro.png',
  '/record player/base.png': '/record-player/base.png',
  '/record player/disc.png': '/record-player/disc.png',
  '/record player/toneram.png': '/record-player/toneram.png',
  '/record player/Orange record.png': '/record-player/Orange_record.png',
  '/record player/Red record.png': '/record-player/Red_record.png',
  '/record player/Yellow record.png': '/record-player/Yellow_record.png',
};

/**
 * Build a delivery URL for an asset that lives in `public/`.
 *
 * @param publicPath path as it exists on disk, e.g. `/events/1.png`
 * @param transforms extra ImageKit transforms, e.g. `'w-800'`. `f-auto` is
 *   always applied, and `q-auto` unless an explicit `q-` is passed.
 */
export function ik(publicPath: string, ...transforms: string[]): string {
  const local = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;

  // encodeURI (not encodeURIComponent) so `/` stays a separator; it is also
  // what turns `record player` into `record%20player` for the local fallback.
  if (!BASE) return encodeURI(local);

  const extra = transforms.filter(Boolean);
  const parts = ['f-auto', ...extra];
  if (!extra.some((t) => t.startsWith('q-'))) parts.push('q-auto');

  return `${BASE}${encodeURI(REMOTE_PATH[local] ?? local)}?tr=${parts.join(',')}`;
}

/** `url(...)` value for inline styles. CSS files hardcode their URLs instead. */
export const ikUrl = (publicPath: string, ...transforms: string[]): string =>
  `url(${ik(publicPath, ...transforms)})`;

/** Resolve a public path to its uploaded remote path (handles the space/`&`
 *  renames), without any query string. Shared by the video builders. */
function remote(publicPath: string): string {
  const local = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  return `${BASE}${encodeURI(REMOTE_PATH[local] ?? local)}`;
}

/**
 * HLS adaptive-bitrate manifest URL for a video in `public/`.
 *
 * ImageKit segments the source into the given resolution ladder and serves it
 * as buffered HLS chunks off `ik-master.m3u8` — the player pulls only the
 * segments and bitrate the connection can sustain, so playback starts fast and
 * adapts instead of blocking on one big file. This is the streaming path.
 *
 * ABR is INCOMPATIBLE with `f-`/`q-`/`w-`/`h-` transforms (ImageKit rejects
 * them), so this URL carries only `sr-` — do not add `f-auto`/`q-auto` here.
 * That combination on a plain `.mp4` is what made the old URL 202/stall: a
 * quality transform forces a background transcode the `<video>` can't consume.
 *
 * First request for a not-yet-processed video returns `202 Accepted` while
 * ImageKit builds the variants; `useHlsVideo` retries and falls back to the
 * progressive MP4 if the manifest is not ready in time, so it never hard-stalls.
 *
 * With `NEXT_PUBLIC_IMAGEKIT_URL` unset, returns the plain local path.
 */
export function ikVideoHls(publicPath: string, resolutions = '240_360_480_720'): string {
  const local = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  if (!BASE) return encodeURI(local);
  return `${remote(local)}/ik-master.m3u8?tr=sr-${resolutions}`;
}

/**
 * Progressive (whole-file) video URL — no transforms, so ImageKit returns the
 * stored bytes immediately with no transcode step. The guaranteed fallback for
 * browsers without Media Source Extensions or when the HLS manifest is still
 * building. Kept transform-free on purpose: instant `200`, no 202.
 */
export function ikVideo(publicPath: string): string {
  const local = publicPath.startsWith('/') ? publicPath : `/${publicPath}`;
  if (!BASE) return encodeURI(local);
  return remote(local);
}
