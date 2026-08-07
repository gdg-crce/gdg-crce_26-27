/**
 * The one film on the site.
 *
 * Three elements play it: the preloader's film-strip reveal cell, the
 * preloader's reveal portal, and the hero. They all read this constant, which
 * is the whole trick — one identical URL means one download, one cache entry,
 * and a zoom-through that hands over between elements already showing the same
 * decoded footage. Never inline a video URL at a call site; that silently
 * doubles the download and desynchronises the handover.
 *
 * ── Served from `public/`, not from a CDN, and not streamed ────────────────
 * This has now failed twice as a network problem, so it is worth being precise
 * about why it is a local file:
 *
 *  - As ImageKit HLS (`ik-master.m3u8?tr=sr-240_360_480_720`), ABR picked a low
 *    rung and held it, so the FULL-SCREEN hero played at 240/360p while the
 *    tiny film-strip cell — a plain progressive file — looked sharp.
 *  - The manifest only exists while the ImageKit video plan is active. Without
 *    it the playlist 202s or 404s forever and the hero renders nothing.
 *  - A `?tr=` transcode carries that same plan dependency and has nothing to
 *    win: the file is 1.17 MB, which is smaller than most hero images.
 *
 * The file is already as optimised as a progressive mp4 gets — verified, not
 * assumed:
 *
 *    1,200,357 bytes (1.17 MB)
 *    moov atom at byte 36, before mdat   faststart: playback can begin after
 *                                        ~22 KB, not after the last byte
 *    Accept-Ranges: bytes                seeking works
 *
 * So there is nothing for a bitrate ladder to adapt to and nothing for a
 * transform to shrink. One request, no MSE, no hls.js, no subscription to
 * lapse. The remaining wins live on the element (`preload="auto"`, `muted`,
 * `playsInline`), not in the transport.
 *
 * ── If the full-screen hero looks soft, it is the MASTER, not the transport ─
 * The current file is **848×478**. The hero is full-viewport `object-cover`, so
 * on a 1080p display that is a 2.26× upscale and it will read soft; the strip
 * cell looks sharp at the same instant because it is DOWN-scaling the same
 * frames into ~100px. The zoom-through's transform math was checked and lands
 * exactly on `scale(1)` — nothing in the code is adding blur, and no transport
 * change can invent the missing pixels.
 *
 * The fix is a better export: re-encode at 1920×1080 (or at minimum 1280×720),
 * H.264 High, CRF ~20, and `-movflags +faststart`, then drop it in at this same
 * path. No code change is needed. Budget ~4-6 MB for 19s at 1080p; that is
 * still one cached request and it is the correct place to spend the bytes,
 * because this film is the first thing anyone sees.
 */

export const HERO_VIDEO_SRC = '/videos/a.mp4';
