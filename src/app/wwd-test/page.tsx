'use client';

// TEMPORARY verification route for WhatWeDoSection — DELETE AFTER TESTING.
import WhatWeDoSection from '@/components/sections/whatwedo/WhatWeDoSection';

export default function WwdTestPage() {
  return (
    <div style={{ background: '#07060a', color: '#eee' }}>
      <div style={{ height: '30vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        scroll down ↓ (temp test harness)
      </div>
      <WhatWeDoSection />
      <div style={{ height: '60vh' }} />
    </div>
  );
}
