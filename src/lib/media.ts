/**
 * Local media served straight out of `public/`.
 *
 * The hero intro is NOT streamed. It used to be pulled from ImageKit as
 * adaptive-bitrate HLS (`ik-master.m3u8?tr=sr-240_360_480_720`), which cost us
 * both halves of the thing it was supposed to buy:
 *
 *  - ABR picked a low rung and held it, so the full-screen hero played back at
 *    240/360p while the tiny film-strip cell — a plain progressive file — looked
 *    sharp. That is the "quality degrades when it gets big" defect.
 *  - The manifest only exists while the ImageKit video plan is active. Without
 *    it the master playlist 202s or 404s forever and the hero renders nothing,
 *    which is why the big video simply did not run.
 *
 * The file is 1.1 MB of 1280×720 H.264 — smaller than most hero images — so
 * there is nothing for a streaming ladder to adapt to. One request, one cache
 * entry, no MSE, no hls.js, and it cannot break when a subscription lapses.
 *
 * Both the preloader's film-strip reveal cell and the hero itself point here on
 * purpose: same URL means the browser downloads it once and the zoom-through
 * hands over between two elements showing the same footage.
 */
export const HERO_VIDEO_SRC = '/videos/hero-intro.mp4';
