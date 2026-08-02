'use client';

import React, { useState } from 'react';
import Preloader from '@/components/sections/Preloader';
import HeroVideoSection from '@/components/sections/hero-video/HeroVideoSection';
import HomeSection from '@/components/sections/home/HomeSection';
import EventsAndCouncilSection from '@/components/sections/EventsAndCouncilSection';
import AboutSection from '@/components/sections/about/AboutSection';
import WhatWeDoSection from '@/components/sections/whatwedo/WhatWeDoSection';
import ContactSection from '@/components/sections/contact/ContactSection';

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
        {/* The black title card the hero's iris closes onto, and whose letters
            open again as a window onto the turntable. Fixed and self-stacking
            (z 9996, between the hero at 9997 and the About pin at 9995), so its
            position in this list is documentation, not layout. */}
        <HomeSection />
        {/* Zero spacer: About turntable sits directly under the hero at top:0 to prevent scroller up artifacts. */}
        <AboutSection />
        <WhatWeDoSection />
        <EventsAndCouncilSection />
        <ContactSection />
      </main>
    </div>
  );
}

