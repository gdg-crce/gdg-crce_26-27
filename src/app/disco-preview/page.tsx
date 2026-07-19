'use client';

// TEMPORARY dev-only preview route for the disco ball — DELETE before shipping.
import dynamic from 'next/dynamic';
import React, { useEffect, useRef, useState } from 'react';

const DiscoBallScene = dynamic(() => import('@/components/three/DiscoBallScene'), { ssr: false });

export default function DiscoPreviewPage() {
  const revealRef = useRef(0);
  const rotationRef = useRef(0);
  const [val, setVal] = useState(1);

  useEffect(() => {
    const r = parseFloat(new URL(window.location.href).searchParams.get('reveal') ?? '1');
    revealRef.current = r;
    rotationRef.current = r;
    setVal(r);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a' }}>
      <DiscoBallScene revealRef={revealRef} rotationRef={rotationRef} active />
      <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        defaultValue={val}
        onChange={(e) => {
          const v = parseFloat(e.target.value);
          revealRef.current = v;
          rotationRef.current = v;
        }}
        style={{ position: 'fixed', bottom: 20, left: 20, width: 320, zIndex: 10 }}
      />
    </div>
  );
}
