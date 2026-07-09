'use client';

import Image from 'next/image';
import React from 'react';
import { orbitron, shareTechMono } from '@/lib/fonts';

interface VHSTapeProps {
  reelRotation: number;
  logoScale: number;
}

export default function VHSTape({ reelRotation, logoScale }: VHSTapeProps) {
  return (
    <div className="loader-vhs-model" style={{ '--reel-rotation': `${reelRotation}deg`, '--logo-scale': logoScale } as React.CSSProperties}>
      <div className="loader-vhs-depth loader-vhs-depth-back" />
      <div className="loader-vhs-shell">
        <div className="loader-vhs-top-rail" />
        <div className="loader-vhs-bottom-rail" />
        <div className="loader-vhs-window loader-vhs-window-left">
          <div className="loader-vhs-reel loader-vhs-reel-left" />
        </div>
        <div className="loader-vhs-window loader-vhs-window-right">
          <div className="loader-vhs-reel loader-vhs-reel-right" />
        </div>
        <div className="loader-vhs-tape-path" />

        <div className="loader-vhs-label">
          <div className={`${orbitron.className} loader-vhs-engraved loader-vhs-engraved-left`}>GDG</div>
          <div className="loader-vhs-logo-well">
            <Image
              src="/logo.png"
              alt="GDG CRCE logo"
              width={128}
              height={128}
              loading="lazy"
              className="loader-vhs-logo"
            />
          </div>
          <div className={`${orbitron.className} loader-vhs-engraved loader-vhs-engraved-right`}>FRCRCE</div>
          <div className={`${shareTechMono.className} loader-vhs-microcopy`}>rewound master / council archive</div>
        </div>

        <div className="loader-vhs-screw loader-vhs-screw-a" />
        <div className="loader-vhs-screw loader-vhs-screw-b" />
        <div className="loader-vhs-screw loader-vhs-screw-c" />
        <div className="loader-vhs-screw loader-vhs-screw-d" />
      </div>
      <div className="loader-vhs-depth loader-vhs-depth-front" />
    </div>
  );
}


