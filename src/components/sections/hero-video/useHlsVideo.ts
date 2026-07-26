'use client';

import { useEffect } from 'react';
import type { RefObject } from 'react';

/**
 * Attach an ImageKit HLS stream to a <video>, with a progressive-MP4 fallback
 * so it can never hard-stall.
 *
 * Playback path by browser:
 * - Safari / iOS: native HLS — set `src` to the manifest directly.
 * - Chrome / Firefox / Edge: lazy-load hls.js and pipe the segments in.
 * - No MSE support, a fatal hls.js error, or the manifest still building
 *   (ImageKit returns 202 on the first ever request for a video): swap to the
 *   progressive MP4 and keep going.
 *
 * The hook owns the video's SOURCE only. Play/pause/seek stay with the caller
 * (HeroVideoSection drives those off the preloader handoff).
 */
export function useHlsVideo(
  videoRef: RefObject<HTMLVideoElement | null>,
  hlsUrl: string,
  mp4Url: string,
): void {
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // No CDN configured: ik*() returned a local path for both — just use it.
    if (hlsUrl === mp4Url) {
      if (video.src !== mp4Url) video.src = mp4Url;
      return;
    }

    let hls: import('hls.js').default | null = null;
    let cancelled = false;
    let fellBack = false;
    let graceTimer: number | undefined;

    const toProgressive = () => {
      if (fellBack || cancelled) return;
      fellBack = true;
      if (hls) {
        hls.destroy();
        hls = null;
      }
      const prevTime = video.currentTime || 0;
      video.src = mp4Url;
      video.load();
      // Keep playback position across the swap where possible.
      video.addEventListener(
        'loadedmetadata',
        () => {
          try {
            video.currentTime = prevTime;
          } catch {}
          if (!video.paused) video.play().catch(() => {});
        },
        { once: true },
      );
    };

    // Native HLS (Safari / iOS): no library needed.
    if (video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = hlsUrl;
      video.addEventListener('error', toProgressive, { once: true });
      return () => {
        cancelled = true;
        video.removeEventListener('error', toProgressive);
      };
    }

    import('hls.js')
      .then(({ default: Hls }) => {
        if (cancelled) return;
        if (!Hls.isSupported()) {
          toProgressive();
          return;
        }
        hls = new Hls({ enableWorker: true, lowLatencyMode: false });
        hls.loadSource(hlsUrl);
        hls.attachMedia(video);
        hls.on(Hls.Events.ERROR, (_evt, data) => {
          // Any fatal pipeline error (incl. a stubborn 202 manifest) -> MP4.
          if (data.fatal) toProgressive();
        });
        // Safety net: if the stream has not become playable in time (manifest
        // still transcoding, flaky network), drop to the progressive file.
        graceTimer = window.setTimeout(() => {
          if (!cancelled && video.readyState < 2) toProgressive();
        }, 6000);
      })
      .catch(toProgressive);

    return () => {
      cancelled = true;
      if (graceTimer) clearTimeout(graceTimer);
      if (hls) {
        hls.destroy();
        hls = null;
      }
    };
  }, [videoRef, hlsUrl, mp4Url]);
}
