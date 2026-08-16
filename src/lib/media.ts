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

/**
 * The two council clips on TheFacebook wall (Y2KArchiveSystem).
 *
 * Unlike the hero, these are NOT preloaded and NOT part of the critical path.
 * They are behind a click-to-play facade: nothing is requested until the user
 * presses play, so their combined 5.2 MB costs exactly zero bytes on a visit
 * where nobody clicks. That is the entire reason they can live inside Act 3 at
 * all — the archive window sits over a running WebGL scene, and a second video
 * decoding uninvited is precisely the kind of thing that costs frames there.
 *
 * Verified before shipping (boxes parsed, not assumed — there is no ffmpeg on
 * this machine):
 *
 *              bytes      codecs        pixels    aspect   duration   bitrate
 *   clip-1   1,329,064    avc1 + mp4a   368x400   0.920    10.2s      ~1.04 Mbps
 *   clip-2   4,158,791    avc1 + mp4a   848x478   1.774    26.7s      ~1.25 Mbps
 *
 * `moov` sits before `mdat` in both, i.e. they are already faststart, so
 * playback begins after the first few KB rather than after the whole file.
 * H.264/AAC, so they decode in every current browser. There is nothing to gain
 * from re-encoding them and no transcode step to keep working; drop
 * replacements at these same paths and nothing else changes.
 *
 * ── Both clips are 16:9 CONTENT, and clip-1 lies about it ──────────────────
 * clip-2 is 848x478 (1.774) and means it. clip-1 reports 368x400 — nearly
 * square — but 101px of that height at the top and 88px at the bottom are HARD
 * BLACK, baked into the frames by whatever exported it. Its real content is
 * 368x211, i.e. 1.744: the same 16:9 as the other clip.
 *
 * Measured, not eyeballed — row luminance means across the decoded frames put
 * the content at rows 101..311 on every frame sampled. So the wall frames both
 * clips at 16:9 and `object-fit: cover`s them, which crops clip-1's dead bars
 * away instead of dutifully framing them. `focusY` is where that crop window
 * sits: 0.531 for clip-1 because its content band is NOT vertically centred
 * (101px above it, 88px below), 0.5 for clip-2 which needs no correction.
 *
 * Because the aspect is a known constant rather than something read off the
 * element, the frame lays out at its final size on the first paint — no reflow
 * when metadata arrives, which matters inside a pinned ScrollTrigger.
 *
 * ── The posters ─────────────────────────────────────────────────────────────
 * `poster` is the clip's own first frame, captured by decoding the video in a
 * browser and reading frame 0 off a 2D canvas, because there is no ffmpeg here.
 * They are the FULL source frame, black bars and all, deliberately NOT
 * pre-cropped: poster and <video> then share one object-fit/object-position
 * rule, so the picture cannot shift or jump at the moment playback starts. The
 * bars cost almost nothing — flat black is nearly free in JPEG, and the two
 * posters are 12.3 KB and 7.3 KB.
 *
 * They arrived as `WhatsApp Video 2026-08-15 at 11.07.08 PM.mp4` and friends.
 * The spaces and dots made for URLs that need encoding at every call site, so
 * they were renamed once, here, where the rename is recorded.
 */
export const COUNCIL_CLIPS = [
  {
    src: '/videos/facebookVideo/clip-1.mp4',
    poster: '/videos/facebookVideo/clip-1-poster.jpg',
    caption: 'council, off the clock',
    focusY: 0.531,
  },
  {
    src: '/videos/facebookVideo/clip-2.mp4',
    poster: '/videos/facebookVideo/clip-2-poster.jpg',
    caption: 'behind the scenes',
    focusY: 0.5,
  },
] as const;
