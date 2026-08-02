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

/*
 * There are deliberately no video helpers here.
 *
 * This file used to export `ikVideoHls()` (an `ik-master.m3u8?tr=sr-…` ABR
 * manifest) and `ikVideo()` (its progressive fallback). Video is no longer
 * served from the CDN at all: the one film on the site is a 1.1 MB local file,
 * see `src/lib/media.ts`. Adding a streaming ladder back for it would only
 * reintroduce the two failure modes it caused — a low bitrate rung held for
 * the full-screen hero, and a manifest that stops existing when the ImageKit
 * video plan does.
 */
