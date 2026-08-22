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
 * Current file — measured, not assumed:
 *
 *    6,135,326 bytes (5.85 MB)
 *    1440×810, H.264 High L4.0, yuv420p, 30fps, 18.13s, ~2.71 Mbps
 *    NO audio track
 *    moov atom at byte 32, before mdat   faststart: playback can begin after
 *                                        a few KB, not after the last byte
 *
 * So there is nothing for a bitrate ladder to adapt to and nothing for a
 * transform to shrink. One request, no MSE, no hls.js, no subscription to
 * lapse. The remaining wins live on the element (`preload="auto"`, `muted`,
 * `playsInline`), not in the transport.
 *
 * ── faststart is the whole ballgame; it has been lost once ─────────────────
 * A previous export sat here at **15,969,110 bytes (15.2 MB), 1920×1080 at
 * 7.04 Mbps, with `moov` at byte 15,953,544 — i.e. AFTER `mdat`, at the very
 * end of the file.** A progressive mp4 whose `moov` trails cannot start until
 * the LAST byte has arrived, so the film did not begin playing until all
 * 15.2 MB had downloaded. That single property produced every symptom the
 * loader was blamed for: the video "sometimes not running" (the preloader's
 * 4.5s asset gate timed out and the show started over a black rectangle), and
 * the film "ending before it finished" (see `HeroVideoSection`, where a
 * mount-time `(duration || 12)` timeout irised an 18.1s film shut at 12.5s
 * because metadata had not landed to make `duration` a number).
 *
 * If you ever replace this file, re-encode it — do not just drop an export in:
 *
 *   ffmpeg -i in.mp4 -vf scale=1440:-2:flags=lanczos -c:v libx264 \
 *     -profile:v high -level 4.0 -pix_fmt yuv420p -preset veryslow -crf 24 \
 *     -maxrate 4500k -bufsize 9000k -g 60 -keyint_min 30 -sc_threshold 0 \
 *     -an -movflags +faststart out.mp4
 *
 * and then VERIFY the box order (`moov` must precede `mdat`) rather than
 * trusting the flag. `-an` is deliberate: every element that plays this file
 * is `muted`, so the audio track is a decoder and a download for nothing — the
 * old file carried a 2.7 kbps stub.
 *
 * Budget is ~4-6 MB for this 18s film. The chosen point was picked off a VMAF
 * sweep against the 15.2 MB master rather than by eye: 1440×810/CRF24 scores
 * **90.9 VMAF at 5.85 MB**, where 1920×1080/CRF25 cost 7.64 MB for 92.5 and
 * 1280×720/CRF26 saved only 1.9 MB to drop to 85.7. It is one cached request
 * and it is the correct place to spend the bytes, because this film is the
 * first thing anyone sees.
 */

export const HERO_VIDEO_SRC = '/videos/a.mp4';

/**
 * Frame 0 of {@link HERO_VIDEO_SRC}, as a still.
 *
 * The loader's film strip shows THIS, not a running `<video>`. Two reasons,
 * and the first one was a visible bug:
 *
 *  - **The film used to open on one pure-black frame.** Anything parked at
 *    `currentTime = 0` therefore rendered black, so the zoom-through opened
 *    onto a black rectangle — the "screens black out" at the reveal. The master
 *    is now re-encoded with that frame dropped (`select='gte(n,1)'`), so frame
 *    0 is the CRT static the film actually starts on, and this still is taken
 *    from the trimmed file. Regenerate it whenever the film is replaced, or the
 *    strip will show a frame the film no longer starts on.
 *  - **The film is only ever decoded once now.** The strip cell used to run its
 *    own `autoPlay loop` copy at full 1440x810 to fill a ~330px window, while
 *    the portal and the hero decoded the same file alongside it. A still costs
 *    90KB and no decoder.
 *
 * 640px wide, which is ~2x the strip cell's on-screen width at a 1920 viewport.
 */
export const HERO_VIDEO_FIRST_FRAME = '/videos/a-first-frame.jpg';

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
