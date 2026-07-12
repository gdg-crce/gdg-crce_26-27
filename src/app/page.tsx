'use client';

import React, { useState } from 'react';
import Preloader from '@/components/sections/Preloader';
import EventsSection from '@/components/sections/events/EventsSection';

export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      {!loading && (
        <main>
          <EventsSection />
        </main>
      )}
    </>
  );
}
