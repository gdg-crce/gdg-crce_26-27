'use client';

import React, { useState } from 'react';
import Preloader from '@/components/sections/Preloader';

export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {loading && <Preloader onComplete={() => setLoading(false)} />}
      {!loading && (
        <main className="flex-grow flex items-center justify-center min-h-screen">
        </main>
      )}
    </>
  );
}
