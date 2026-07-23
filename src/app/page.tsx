'use client';

import React, { useState } from 'react';
import Preloader from '@/components/sections/Preloader';
import HeroVideoSection from '@/components/sections/hero-video/HeroVideoSection';
import EventsAndCouncilSection from '@/components/sections/EventsAndCouncilSection';
import AboutSection from '@/components/sections/about/AboutSection';
import WhatWeDoSection from '@/components/sections/whatwedo/WhatWeDoSection';

import TearTransition from '@/components/sections/TearTransition';

export default function Home() {
  const [loading, setLoading] = useState(true);
  const [videoStarted, setVideoStarted] = useState(false);

  const handleStartTransition = React.useCallback(() => {
    window.scrollTo(0, 0);
    setVideoStarted(true);
  }, []);

  const handleComplete = React.useCallback(() => {
    window.scrollTo(0, 0);
    setLoading(false);
  }, []);

  return (
    <div className="relative min-h-screen bg-[#0a0807] text-neutral-200">
      {loading && (
        <Preloader
          onStartTransition={handleStartTransition}
          onComplete={handleComplete}
        />
      )}
      <main className="relative z-0">
        <HeroVideoSection startPlaying={videoStarted} />
        {/* The hero is position:fixed and so contributes no page height. This
            runway is the scroll the looping intro fades out across, while the
            About turntable rises into view and fades up over it. */}
        <div aria-hidden="true" className="h-[100vh]" />
        <AboutSection />
        <WhatWeDoSection />
        <TearTransition />
        <EventsAndCouncilSection />
      </main>
    </div>
  );
}

