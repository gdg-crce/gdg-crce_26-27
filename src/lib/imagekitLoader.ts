'use client';

import { ik } from './imagekit';

/**
 * Custom `next/image` loader, wired in next.config.ts.
 *
 * Next calls this once per entry in its `deviceSizes`/`imageSizes` list to
 * build the srcset, so this is what gives phones a phone-sized download
 * instead of the desktop original.
 *
 * With `NEXT_PUBLIC_IMAGEKIT_URL` unset, `ik()` returns the plain local path
 * and images render unoptimized from `public/` — the intended offline/no-CDN
 * fallback, not a bug.
 */
export default function imagekitLoader({
  src,
  width,
  quality,
}: {
  src: string;
  width: number;
  quality?: number;
}): string {
  return ik(src, `w-${width}`, quality ? `q-${quality}` : '');
}
