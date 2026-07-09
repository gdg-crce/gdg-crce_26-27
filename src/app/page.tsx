'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Preloader from '@/components/sections/Preloader';
import Navbar from '@/components/ui/Navbar';
import Hero from '@/components/sections/Hero';
import Aboutdisco from '@/components/sections/Aboutdisco';
import WhatWeDo from '@/components/sections/WhatWeDo';
import Eventtimeline from '@/components/sections/Eventtimeline';
import Council from '@/components/sections/Council';
import Footer from '@/components/sections/Footer';
import { EraProvider } from '@/components/ui/EraContext';

export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      {/* 1. Preloader Overlay */}
      <Preloader onComplete={() => setLoading(false)} />

      {/* 2. Main Page Render */}
      <AnimatePresence>
        {!loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="flex flex-col min-h-screen"
          >
            <EraProvider>
              <Navbar />
              
              <main className="flex-grow">
                <Hero />
                <Aboutdisco />
                <WhatWeDo />
                <Eventtimeline />
                <Council />
                <Footer />
              </main>
            </EraProvider>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
