'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface PreloaderAudioEngine {
  soundEnabled: boolean;
  toggleSound: () => void;
  stopAllAudio: () => void;
  updateVelocity: (velocity: number) => void;
  playInsertClick: () => void;
}

/**
 * Lightweight procedural + external audio engine for the analog preloader.
 * Generates custom synthesized buffers (takes <2ms) or decodes /audio/*.mp3 if present.
 */
export function usePreloaderAudio(): PreloaderAudioEngine {
  const [soundEnabled, setSoundEnabled] = useState(true);
  const ctxRef = useRef<AudioContext | null>(null);

  // Audio Nodes
  const humSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const humGainRef = useRef<GainNode | null>(null);

  const whirSourceRef = useRef<AudioBufferSourceNode | null>(null);
  const whirGainRef = useRef<GainNode | null>(null);

  const clickBufferRef = useRef<AudioBuffer | null>(null);
  const hasClickedRef = useRef(false);

  // Velocity smoothing state
  const currentVelocityRef = useRef(0);
  const targetVelocityRef = useRef(0);
  const animFrameRef = useRef<number | null>(null);

  /**
   * Generates a procedural pink/analog noise buffer for tape hum
   */
  const createHumBuffer = (ctx: AudioContext): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate * 2, sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99765 * b0 + white * 0.049922;
      b1 = 0.963 * b1 + white * 0.04;
      b2 = 0.57 * b2 + white * 0.1;
      data[i] = (b0 + b1 + b2) * 0.15;
    }
    return buffer;
  };

  /**
   * Generates a procedural mechanical motor whir buffer
   */
  const createWhirBuffer = (ctx: AudioContext): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const buffer = ctx.createBuffer(1, sampleRate, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const t = i / sampleRate;
      const carrier = (Math.random() * 2 - 1) * 0.55;
      const mod = 0.6 + 0.4 * Math.sin(t * Math.PI * 80);
      data[i] = carrier * mod;
    }
    return buffer;
  };

  /**
   * Generates a procedural VCR mechanical clunk-click buffer
   */
  const createClickBuffer = (ctx: AudioContext): AudioBuffer => {
    const sampleRate = ctx.sampleRate;
    const length = Math.floor(sampleRate * 0.22);
    const buffer = ctx.createBuffer(1, length, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      const decay = Math.exp(-t * 22);
      const thud = Math.sin(t * Math.PI * 140) * 0.95;
      const snap = (Math.random() * 2 - 1) * Math.exp(-t * 90) * 0.7;
      data[i] = (thud + snap) * decay;
    }
    return buffer;
  };

  /**
   * Initialize or resume AudioContext and start looping nodes
   */
  const initAudioGraph = useCallback(async () => {
    if (!ctxRef.current) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new AudioCtx();
      ctxRef.current = ctx;

      // Try loading external files or fallback to procedural buffers immediately
      let humBuffer = createHumBuffer(ctx);
      let whirBuffer = createWhirBuffer(ctx);
      let clickBuffer = createClickBuffer(ctx);

      try {
        const [humRes, whirRes, clickRes] = await Promise.allSettled([
          fetch('/audio/tape-hum.mp3'),
          fetch('/audio/tape-rewind.mp3'),
          fetch('/audio/tape-insert.mp3'),
        ]);

        if (humRes.status === 'fulfilled' && humRes.value.ok) {
          humBuffer = await ctx.decodeAudioData(await humRes.value.arrayBuffer());
        }
        if (whirRes.status === 'fulfilled' && whirRes.value.ok) {
          whirBuffer = await ctx.decodeAudioData(await whirRes.value.arrayBuffer());
        }
        if (clickRes.status === 'fulfilled' && clickRes.value.ok) {
          clickBuffer = await ctx.decodeAudioData(await clickRes.value.arrayBuffer());
        }
      } catch {
        // Procedural fallback already assigned
      }

      clickBufferRef.current = clickBuffer;

      // Setup ambient hum loop (warm analog floor)
      const humSource = ctx.createBufferSource();
      humSource.buffer = humBuffer;
      humSource.loop = true;
      const humGain = ctx.createGain();
      humGain.gain.value = 0.35;
      humSource.connect(humGain);
      humGain.connect(ctx.destination);
      humSource.start();
      humSourceRef.current = humSource;
      humGainRef.current = humGain;

      // Setup mechanical rewind whir loop (full frequency spectrum)
      const whirSource = ctx.createBufferSource();
      whirSource.buffer = whirBuffer;
      whirSource.loop = true;
      const whirGain = ctx.createGain();
      whirGain.gain.value = 0;
      whirSource.connect(whirGain);
      whirGain.connect(ctx.destination);
      whirSource.start();
      whirSourceRef.current = whirSource;
      whirGainRef.current = whirGain;
    } else if (ctxRef.current.state === 'suspended') {
      await ctxRef.current.resume();
    }
  }, []);

  /**
   * Automatically initialize and unlock audio graph on mount or user interaction
   */
  useEffect(() => {
    if (!soundEnabled) return;

    initAudioGraph();

    const unlock = () => {
      if (soundEnabled) {
        initAudioGraph();
      }
    };

    window.addEventListener('wheel', unlock, { passive: true });
    window.addEventListener('pointerdown', unlock, { passive: true });
    window.addEventListener('touchstart', unlock, { passive: true });
    window.addEventListener('keydown', unlock, { passive: true });

    return () => {
      window.removeEventListener('wheel', unlock);
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('touchstart', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, [soundEnabled, initAudioGraph]);

  /**
   * Damped animation loop that smoothly modulates tape whir volume and pitch
   */
  useEffect(() => {
    if (!soundEnabled) return;

    const loop = () => {
      const ctx = ctxRef.current;
      const whirGain = whirGainRef.current;
      const whirSource = whirSourceRef.current;

      if (ctx && whirGain && whirSource) {
        currentVelocityRef.current += (targetVelocityRef.current - currentVelocityRef.current) * 0.18;
        const vel = Math.min(Math.abs(currentVelocityRef.current), 1);

        const targetGain = Math.min(vel * 2.5, 1.0);
        const targetPitch = 0.55 + vel * 0.45;

        whirGain.gain.setTargetAtTime(targetGain, ctx.currentTime, 0.04);
        whirSource.playbackRate.setTargetAtTime(targetPitch, ctx.currentTime, 0.04);

        // Gradually decay target velocity toward zero when scrolling stops
        targetVelocityRef.current *= 0.86;
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [soundEnabled]);

  const toggleSound = useCallback(() => {
    if (!soundEnabled) {
      initAudioGraph();
      setSoundEnabled(true);
    } else {
      if (ctxRef.current && ctxRef.current.state === 'running') {
        ctxRef.current.suspend();
      }
      setSoundEnabled(false);
    }
  }, [soundEnabled, initAudioGraph]);

  const stopAllAudio = useCallback(() => {
    if (ctxRef.current) {
      try {
        ctxRef.current.suspend();
        ctxRef.current.close();
      } catch {}
      ctxRef.current = null;
    }
    setSoundEnabled(false);
  }, []);

  const updateVelocity = useCallback((velocity: number) => {
    if (!soundEnabled) return;
    targetVelocityRef.current = Math.min(Math.abs(velocity) * 10, 1);
  }, [soundEnabled]);

  const playInsertClick = useCallback(() => {
    if (!soundEnabled || !ctxRef.current || hasClickedRef.current) return;
    hasClickedRef.current = true;

    const ctx = ctxRef.current;

    // 1. Play external tape-insert.mp3 loud (gain 3.5)
    if (clickBufferRef.current) {
      const source = ctx.createBufferSource();
      source.buffer = clickBufferRef.current;
      const gain = ctx.createGain();
      gain.gain.value = 3.5;
      source.connect(gain);
      gain.connect(ctx.destination);
      source.start();
    }

    // 2. Play browser-friendly procedural sub-bass mechanical thud for cinematic tactile punch
    try {
      const procBuffer = createClickBuffer(ctx);
      const procSource = ctx.createBufferSource();
      procSource.buffer = procBuffer;
      const procGain = ctx.createGain();
      procGain.gain.value = 1.4;
      procSource.connect(procGain);
      procGain.connect(ctx.destination);
      procSource.start();
    } catch {}
  }, [soundEnabled]);

  return {
    soundEnabled,
    toggleSound,
    stopAllAudio,
    updateVelocity,
    playInsertClick,
  };
}
