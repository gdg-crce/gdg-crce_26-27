'use client';

import React, { useState } from 'react';
import Preloader from '@/components/sections/Preloader';
import HeroVideoSection from '@/components/sections/hero-video/HeroVideoSection';
import EventsSection from '@/components/sections/events/EventsSection';
import CouncilSection from '@/components/sections/council';

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
        <EventsSection />
        <CouncilSection />
      </main>
    </div>
  );
}

