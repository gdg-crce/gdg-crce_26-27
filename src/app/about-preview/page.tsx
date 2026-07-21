'use client';

import dynamic from 'next/dynamic';

const AboutSection = dynamic(
  () => import('@/components/sections/about/AboutSection'),
  { ssr: false }
);

/**
 * Dev-only harness for AboutSection.
 *
 * Renders the turntable on its own behind the same 80vh runway the real page
 * gives it, so the scroll timeline can be driven without sitting through the
 * preloader's user gesture and a full pass of the intro video.
 *
 * REMOVE BEFORE SHIPPING (same as /api/devshot and the window.__r3f hooks).
 */
export default function AboutPreviewPage() {
  return (
    <div className="bg-[#08080a]">
      <div aria-hidden="true" className="h-[80vh]" />
      <AboutSection />
      <div aria-hidden="true" className="h-screen" />
    </div>
  );
}
