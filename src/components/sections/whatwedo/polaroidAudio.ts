/**
 * polaroidAudio — the camera's voice.
 *
 * The shutter is the user-supplied clip at /audio/polaroid-shutter.mp3, decoded
 * once into an AudioBuffer for low-latency, scrub-friendly playback. The
 * film-advance whir (played as each print ejects) is synthesised, so no extra
 * asset is needed for it.
 *
 * Autoplay policy: a page needs a user gesture before it may make sound. The
 * site already gates everything behind the preloader's play-button click, and
 * the visitor physically scrolls (a gesture) to reach this section — so by the
 * time anything fires, `unlockPolaroidAudio()` (wired to the first
 * pointer/key/wheel/touch event) has created + resumed the context and kicked
 * off the shutter fetch. If anything is still blocked, every call no-ops.
 */

const SHUTTER_URL = '/audio/polaroid-shutter.mp3';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let shutterBuf: AudioBuffer | null = null;
let shutterLoading = false;
let muted = false;

function ensure(): AudioContext | null {
  if (typeof window === 'undefined' || muted) return null;
  if (!ctx) {
    const AC: typeof AudioContext | undefined =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = 0.85;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
}

function loadShutter(ac: AudioContext) {
  if (shutterBuf || shutterLoading) return;
  shutterLoading = true;
  fetch(SHUTTER_URL)
    .then((r) => r.arrayBuffer())
    .then((buf) => ac.decodeAudioData(buf))
    .then((decoded) => {
      shutterBuf = decoded;
    })
    .catch(() => {})
    .finally(() => {
      shutterLoading = false;
    });
}

/** Call from the first user gesture: creates the context and pre-fetches the clip. */
export function unlockPolaroidAudio() {
  const ac = ensure();
  if (ac) loadShutter(ac);
}

export function setPolaroidMuted(m: boolean) {
  muted = m;
  if (master) master.gain.value = m ? 0 : 0.85;
}

/** The shutter clip. Falls back silently if it hasn't decoded yet. */
export function playShutter(volume = 1) {
  const ac = ensure();
  if (!ac || !master) return;
  if (!shutterBuf) {
    loadShutter(ac); // in case the gesture-time fetch was missed
    return;
  }
  const src = ac.createBufferSource();
  src.buffer = shutterBuf;
  const g = ac.createGain();
  g.gain.value = volume;
  src.connect(g);
  g.connect(master);
  src.start();
}

/**
 * Film advance: the motor that spits the print out. A buzzy sawtooth that
 * pitches up then down, low-passed to a mechanical grind, with a grit of noise.
 */
export function playWhir(volume = 1) {
  const ac = ensure();
  if (!ac || !master) return;
  const now = ac.currentTime;
  const dur = 0.44;

  const osc = ac.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(76, now);
  osc.frequency.linearRampToValueAtTime(98, now + dur * 0.55);
  osc.frequency.linearRampToValueAtTime(68, now + dur);
  const lp = ac.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 820;
  lp.Q.value = 0.7;
  const g = ac.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.linearRampToValueAtTime(0.12 * volume, now + 0.05);
  g.gain.setValueAtTime(0.12 * volume, now + dur - 0.14);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  osc.connect(lp);
  lp.connect(g);
  g.connect(master);
  osc.start(now);
  osc.stop(now + dur);

  const buf = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
  const noise = ac.createBufferSource();
  noise.buffer = buf;
  const nlp = ac.createBiquadFilter();
  nlp.type = 'bandpass';
  nlp.frequency.value = 1400;
  nlp.Q.value = 0.5;
  const ng = ac.createGain();
  ng.gain.setValueAtTime(0.0001, now);
  ng.gain.linearRampToValueAtTime(0.045 * volume, now + 0.06);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  noise.connect(nlp);
  nlp.connect(ng);
  ng.connect(master);
  noise.start(now);
  noise.stop(now + dur);
}
