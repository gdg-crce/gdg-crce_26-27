'use client';

import Image from 'next/image';
import React from 'react';
import { orbitron, shareTechMono } from '@/lib/fonts';

interface VHSTapeProps {
  reelRotation: number;
  logoScale: number;
  revealProgress: number;
}

function clamp(value: number, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

export default function VHSTape({ reelRotation, logoScale, revealProgress }: VHSTapeProps) {
  const reveal = clamp(revealProgress);
  const gdgReveal = clamp(reveal / 0.28);
  const logoReveal = clamp((reveal - 0.18) / 0.3);
  const frcReveal = clamp((reveal - 0.42) / 0.28);
  const rceReveal = clamp((reveal - 0.62) / 0.28);

  return (
    <div
      className="loader-vhs-model"
      style={
        {
          '--reel-rotation-left': `${-reelRotation}deg`,
          '--reel-rotation-right': `${reelRotation}deg`,
          '--logo-scale': logoScale,
          '--gdg-reveal': gdgReveal,
          '--logo-reveal': logoReveal,
          '--frc-reveal': frcReveal,
          '--rce-reveal': rceReveal,
        } as React.CSSProperties
      }
    >
      <div className="loader-vhs-depth loader-vhs-depth-back" />
      <div className="loader-vhs-shell">
        <div className="loader-vhs-shell-grain" />
        <div className="loader-vhs-bevel loader-vhs-bevel-top" />
        <div className="loader-vhs-bevel loader-vhs-bevel-bottom" />
        <div className="loader-vhs-top-rail" />
        <div className="loader-vhs-bottom-rail" />
        <div className="loader-vhs-mouth" />

        <div className="loader-vhs-window loader-vhs-window-left">
          <div className="loader-vhs-reel loader-vhs-reel-left" />
        </div>
        <div className="loader-vhs-window loader-vhs-window-right">
          <div className="loader-vhs-reel loader-vhs-reel-right" />
        </div>
        <div className="loader-vhs-tape-path" />

        <div className="loader-vhs-label">
          <div className={`${orbitron.className} loader-vhs-engraved loader-vhs-engraved-left loader-vhs-reveal-gdg`}>GDG</div>
          <div className="loader-vhs-logo-well">
            <Image
              src="/logo.png"
              alt="GDG CRCE logo"
              width={160}
              height={160}
              priority
              className="loader-vhs-logo"
            />
          </div>
          <div className={`${orbitron.className} loader-vhs-right-mark`}>
            <span className="loader-vhs-engraved loader-vhs-reveal-frc">FRC</span>
            <span className="loader-vhs-engraved loader-vhs-reveal-rce">RCE</span>
          </div>
          <div className={`${shareTechMono.className} loader-vhs-microcopy`}>GDG CRCE / VHS PLAYBACK MASTER</div>
        </div>

        <div className={`${shareTechMono.className} loader-vhs-format loader-vhs-format-left`}>VHS</div>
        <div className={`${shareTechMono.className} loader-vhs-format loader-vhs-format-right`}>SP 26/27</div>
        <div className="loader-vhs-screw loader-vhs-screw-a" />
        <div className="loader-vhs-screw loader-vhs-screw-b" />
        <div className="loader-vhs-screw loader-vhs-screw-c" />
        <div className="loader-vhs-screw loader-vhs-screw-d" />
      </div>
      <div className="loader-vhs-depth loader-vhs-depth-front" />
    </div>
  );
}
