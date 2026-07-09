'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import Preloader from '@/components/sections/Preloader';
import { EraProvider } from '@/components/ui/EraContext';

const Navbar = dynamic(() => import('@/components/ui/Navbar'), { loading: () => null });
const Hero = dynamic(() => import('@/components/sections/Hero'), { loading: () => null });
const Aboutdisco = dynamic(() => import('@/components/sections/Aboutdisco'), { loading: () => null });
const WhatWeDo = dynamic(() => import('@/components/sections/WhatWeDo'), { loading: () => null });
const Eventtimeline = dynamic(() => import('@/components/sections/Eventtimeline'), { loading: () => null });
const Council = dynamic(() => import('@/components/sections/Council'), { loading: () => null });
const Footer = dynamic(() => import('@/components/sections/Footer'), { loading: () => null });

export default function Home() {
  const [loading, setLoading] = useState(true);

  return (
    <>
      <Preloader onComplete={() => setLoading(false)} />

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
