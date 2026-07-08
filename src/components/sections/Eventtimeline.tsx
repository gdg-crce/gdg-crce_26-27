'use client';

import React, { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { cormorantGaramond, inter } from '@/lib/fonts';

if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger);
}

interface EventData {
  title: string;
  category: string;
  description: string;
  date: string;
  time: string;
  images: string[];
}

const eventsData: EventData[] = [
  {
    title: 'Future Forge',
    category: 'INNOVATION HACK',
    description: 'An immersive engineering sprint focused on building decentralized protocols, AI networks, and next-generation web infrastructure.',
    date: 'OCTOBER 12, 2026',
    time: '5:00 - 8:00 PM',
    images: [
      'https://images.unsplash.com/photo-1555066931-4365d14bab8c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1542831371-29b0f74f9713?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=800',
    ],
  },
  {
    title: 'Bit N Build',
    category: 'FLAGSHIP HACKATHON',
    description: 'Our premier 24-hour national hackathon, bringing together top-tier developer talents to build and pitch solutions.',
    date: 'JANUARY 16-17, 2027',
    time: '24-HOUR SPRINT',
    images: [
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=800',
    ],
  },
  {
    title: 'Pitch Perfect',
    category: 'STARTUP SHOWCASE',
    description: 'A high-stakes venture pitching arena where developers present prototype products to industry leaders and investors.',
    date: 'MARCH 5, 2027',
    time: '3:00 - 6:00 PM',
    images: [
      'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1581291518633-83b4ebd1d83e?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1515187029135-18ee286d815b?auto=format&fit=crop&q=80&w=800',
    ],
  },
  {
    title: 'Unplug',
    category: 'COMMUNITY MEETUP',
    description: 'A casual, open-air developer gathering to share ideas, drink coffee, and discuss emerging engineering trends without screens.',
    date: 'JUNE 18, 2027',
    time: '6:00 - 9:00 PM',
    images: [
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1581092921461-eab62e97a780?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1522071820081-009f0129c71c?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1531538606174-0f90ff5dce83?auto=format&fit=crop&q=80&w=800',
    ],
  },
];

// Node heights in % of screen height, matching SVG path spline coordinates
const nodeHeights = [ 50, 55, 42, 50 ];

export default function Eventtimeline() {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const slideRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const section = containerRef.current;
    const scrollContainer = scrollContainerRef.current;
    if (!section || !scrollContainer) return;

    const total = eventsData.length;

    // React Context wrapper to cleanly register/kill all timelines
    const ctx = gsap.context(() => {
      
      // 1. Master horizontal scroll translation tween - ends exactly on the last slide (No empty trailing space)
      const scrollTween = gsap.to(scrollContainer, {
        x: () => -(scrollContainer.scrollWidth - window.innerWidth),
        ease: "none",
        scrollTrigger: {
          trigger: section,
          pin: true,
          scrub: 1,
          start: "top top", // Pins exactly when section fully fits screen
          end: () => `+=${(total - 1) * window.innerHeight * 1.5}`, // Horizontal scrolling wraps up exactly on last slide
          anticipatePin: 1, // Smooths out pinning entrance transition to prevent snapback
          invalidateOnRefresh: true,
        }
      });

      // 2. Parallax background film strip spline (sliding slightly)
      gsap.to('.drift-line-master', {
        x: -180,
        ease: "none",
        scrollTrigger: {
          trigger: section,
          scrub: 1,
          start: "top top",
          end: () => `+=${(total - 1) * window.innerHeight * 1.5}`,
        }
      });

      // 3. Staggered transitions for each slide
      slideRefs.current.forEach((slide, i) => {
        if (!slide) return;

        // Select typography elements
        const category = slide.querySelector('.event-category');
        const title = slide.querySelector('.event-title');
        const desc = slide.querySelector('.event-desc');
        const date = slide.querySelector('.event-date');
        const cta = slide.querySelector('.event-cta');
        
        // Select node connectors
        const nodeDot = slide.querySelector('.timeline-node-dot');
        const nodeLine = slide.querySelector('.timeline-node-line');
        
        // Select image wrappers
        const imgWrappers = slide.querySelectorAll('.img-wrapper');

        // Target rotations and scales
        const targetRotations = [ -3, 4, -2, 3, -4, 2 ];
        const targetScales = [ 1.0, 0.95, 1.05, 0.9, 1.0, 0.95 ];

        // Large horizontal entrance offsets so images move from the right towards the left event title
        const enterOffsets = [
          { x: 120, y: -40, rotate: -20, scale: 0.8 },
          { x: 100, y: 60, rotate: 15, scale: 1.15 },
          { x: 130, y: -20, rotate: -15, scale: 0.75 },
          { x: 110, y: 30, rotate: 20, scale: 0.85 },
          { x: 120, y: -30, rotate: -10, scale: 1.1 },
          { x: 100, y: 40, rotate: 12, scale: 0.9 },
        ];

        // Entrance timeline (slide scrolls in from right)
        const enterTl = gsap.timeline({
          scrollTrigger: {
            trigger: slide,
            containerAnimation: scrollTween,
            start: "left right",
            end: "left left",
            scrub: true,
          }
        });

        // Exit timeline (slide scrolls out to left)
        const exitTl = gsap.timeline({
          scrollTrigger: {
            trigger: slide,
            containerAnimation: scrollTween,
            start: "left left",
            end: "right left",
            scrub: true,
          }
        });

        // Skip entrance fade/translate for Slide 0 on initial load
        if (i > 0) {
          enterTl.fromTo(nodeDot, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, ease: "back.out(1.7)" }, 0)
                 .fromTo(nodeLine, { scaleY: 0 }, { scaleY: 1, transformOrigin: i % 2 === 0 ? "top center" : "bottom center", ease: "power2.out" }, 0.05)
                 .fromTo(category, { opacity: 0, y: i % 2 === 0 ? 30 : -30 }, { opacity: 1, y: 0, ease: "power2.out" }, 0.1)
                 .fromTo(title, { opacity: 0, x: -80 }, { opacity: 1, x: 0, ease: "power3.out" }, 0.15)
                 .fromTo(desc, { opacity: 0, y: i % 2 === 0 ? 40 : -40 }, { opacity: 1, y: 0, ease: "power2.out" }, 0.2)
                 .fromTo(date, { opacity: 0, y: i % 2 === 0 ? 20 : -20 }, { opacity: 1, y: 0, ease: "power2.out" }, 0.25)
                 .fromTo(cta, { opacity: 0, y: i % 2 === 0 ? 20 : -20 }, { opacity: 1, y: 0, ease: "power2.out" }, 0.3);

          imgWrappers.forEach((wrapper, j) => {
            const offset = enterOffsets[j % enterOffsets.length];
            enterTl.fromTo(wrapper,
              {
                opacity: 0,
                xPercent: offset.x,
                yPercent: offset.y,
                rotate: offset.rotate,
                scale: offset.scale
              },
              {
                opacity: 1,
                xPercent: 0,
                yPercent: 0,
                rotate: targetRotations[j % targetRotations.length],
                scale: targetScales[j % targetScales.length],
                ease: "power2.out"
              },
              0.06 * j
            );
          });
        } else {
          // Slide 0 starts in place
          gsap.set([nodeDot, nodeLine, category, title, desc, date, cta], { opacity: 1, scale: 1, scaleY: 1, x: 0, y: 0 });
          imgWrappers.forEach((wrapper, j) => {
            gsap.set(wrapper, {
              opacity: 1,
              xPercent: 0,
              yPercent: 0,
              rotate: targetRotations[j % targetRotations.length],
              scale: targetScales[j % targetScales.length]
            });
          });
        }

        // Exit animations
        if (i < total - 1) {
          exitTl.to(nodeDot, { opacity: 0, scale: 0.5, ease: "power2.in" }, 0)
                .to(nodeLine, { scaleY: 0, transformOrigin: i % 2 === 0 ? "top center" : "bottom center", ease: "power2.in" }, 0.02)
                .to(category, { opacity: 0, y: i % 2 === 0 ? -30 : 30, ease: "power2.in" }, 0.05)
                .to(title, { opacity: 0, y: i % 2 === 0 ? -40 : 40, ease: "power2.in" }, 0.1)
                .to(desc, { opacity: 0, y: i % 2 === 0 ? -40 : 40, ease: "power2.in" }, 0.15)
                .to(date, { opacity: 0, y: i % 2 === 0 ? -30 : 30, ease: "power2.in" }, 0.2)
                .to(cta, { opacity: 0, y: i % 2 === 0 ? -30 : 30, ease: "power2.in" }, 0.25);

          // Disperse collage images on exit
          const exitOffsets = [
            { x: -80, y: 60, rotate: -20 },
            { x: -90, y: -80, rotate: 15 },
            { x: -60, y: 70, rotate: -12 },
            { x: -80, y: -50, rotate: 25 },
            { x: -70, y: 40, rotate: -18 },
            { x: -90, y: -60, rotate: 12 },
          ];

          imgWrappers.forEach((wrapper, j) => {
            const offset = exitOffsets[j % exitOffsets.length];
            exitTl.to(wrapper,
              {
                opacity: 0,
                xPercent: offset.x,
                yPercent: offset.y,
                rotate: offset.rotate,
                scale: 0.85,
                ease: "power2.in"
              },
              0.05 * j
            );
          });
        }
      });

      // 5. Perpetual Floating animation on inner image tags with yoyo loops
      const images = scrollContainer.querySelectorAll('.floating-img');
      images.forEach((img) => {
        const ampX = gsap.utils.random(4, 10);
        const ampY = gsap.utils.random(4, 10);
        const ampRotate = gsap.utils.random(1.5, 3.5);
        const duration = gsap.utils.random(6, 12);

        gsap.set(img, { x: -ampX / 2, y: -ampY / 2, rotate: -ampRotate / 2 });

        gsap.to(img, {
          x: ampX / 2,
          y: ampY / 2,
          rotate: ampRotate / 2,
          duration: duration,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      });

    }, section);

    // 6. Smooth mouse parallax drift
    const handleMouseMove = (e: MouseEvent) => {
      if (window.innerWidth < 1024) return;
      const { clientX, clientY } = e;
      const { innerWidth, innerHeight } = window;
      const xOffset = (clientX / innerWidth - 0.5) * 16;
      const yOffset = (clientY / innerHeight - 0.5) * 16;

      gsap.to('.collage-container', {
        x: xOffset,
        y: yOffset,
        duration: 0.9,
        ease: "power2.out",
        overwrite: "auto",
      });
    };

    section.addEventListener('mousemove', handleMouseMove);

    return () => {
      section.removeEventListener('mousemove', handleMouseMove);
      ctx.revert();
    };
  }, []);

  return (
    <div
      id="events"
      ref={containerRef}
      className="relative w-full h-screen bg-[#070708] text-white overflow-hidden animate-pin-fix"
    >
      {/* Background Vignette */}
      <div className="absolute inset-0 bg-radial-vignette pointer-events-none z-0" />

      {/* Film Grain Textured Overlay */}
      <div className="absolute inset-0 film-grain-custom pointer-events-none opacity-[0.035] z-[1]" />

      {/* Horizontal Storytelling Exhibition Wall Container (520vw total width) */}
      <div
        ref={scrollContainerRef}
        className="flex h-screen w-[520vw] items-center relative z-[3] overflow-visible select-none"
      >
        
        {/* Continuous SVG 35mm Movie Film Strip spooling dynamically from "Events" title */}
        <div className="absolute inset-0 w-full h-full pointer-events-none z-10">
          <svg
            className="drift-line-master absolute inset-0 h-full w-[520vw]"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 5200 1000"
            preserveAspectRatio="none"
          >
            <defs>
              {/* Dark glossy finish representing high-end film ribbon tape */}
              <linearGradient id="tapeBodyGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#4c3d32" /> {/* specular highlight */}
                <stop offset="10%" stopColor="#1a1816" />
                <stop offset="25%" stopColor="#0a0908" /> {/* glossy dark acetate */}
                <stop offset="50%" stopColor="#151311" />
                <stop offset="75%" stopColor="#080706" />
                <stop offset="92%" stopColor="#1d1a17" />
                <stop offset="100%" stopColor="#040303" />
              </linearGradient>
            </defs>

            <g>
              {/* 1. Main Film Strip Body (Width 48px, with drop shadow for 3D realism) */}
              <path
                d="M 100,120 C 220,120 280,250 200,250 C 120,250 100,180 180,350 C 240,420 200,500 350,500 C 600,500 700,200 900,200 C 1100,200 1150,500 950,500 C 800,500 850,350 1050,450 C 1200,500 1400,550 1650,550 C 1900,550 2100,750 2300,750 C 2500,750 2550,550 2350,550 C 2200,550 2250,680 2450,650 C 2650,620 2750,420 2950,420 C 3200,420 3350,250 3550,250 C 3750,250 3800,450 3600,450 C 3450,450 3500,300 3700,380 C 3850,420 4050,500 4250,500 L 5200,500"
                fill="none"
                stroke="url(#tapeBodyGradient)"
                strokeWidth="48"
                strokeLinecap="round"
                style={{ filter: 'drop-shadow(0px 12px 18px rgba(0,0,0,0.85))' }}
              />

              {/* 2. Punched Top Sprocket Holes (translated -17px with custom dasharray) */}
              <path
                d="M 100,120 C 220,120 280,250 200,250 C 120,250 100,180 180,350 C 240,420 200,500 350,500 C 600,500 700,200 900,200 C 1100,200 1150,500 950,500 C 800,500 850,350 1050,450 C 1200,500 1400,550 1650,550 C 1900,550 2100,750 2300,750 C 2500,750 2550,550 2350,550 C 2200,550 2250,680 2450,650 C 2650,620 2750,420 2950,420 C 3200,420 3350,250 3550,250 C 3750,250 3800,450 3600,450 C 3450,450 3500,300 3700,380 C 3850,420 4050,500 4250,500 L 5200,500"
                fill="none"
                stroke="#070708"
                strokeWidth="6"
                strokeDasharray="4 8"
                transform="translate(0, -17)"
              />

              {/* 3. Punched Bottom Sprocket Holes (translated 17px with custom dasharray) */}
              <path
                d="M 100,120 C 220,120 280,250 200,250 C 120,250 100,180 180,350 C 240,420 200,500 350,500 C 600,500 700,200 900,200 C 1100,200 1150,500 950,500 C 800,500 850,350 1050,450 C 1200,500 1400,550 1650,550 C 1900,550 2100,750 2300,750 C 2500,750 2550,550 2350,550 C 2200,550 2250,680 2450,650 C 2650,620 2750,420 2950,420 C 3200,420 3350,250 3550,250 C 3750,250 3800,450 3600,450 C 3450,450 3500,300 3700,380 C 3850,420 4050,500 4250,500 L 5200,500"
                fill="none"
                stroke="#070708"
                strokeWidth="6"
                strokeDasharray="4 8"
                transform="translate(0, 17)"
              />

              {/* 4. Fine Top Bevel Highlight (translated -23px) */}
              <path
                d="M 100,120 C 220,120 280,250 200,250 C 120,250 100,180 180,350 C 240,420 200,500 350,500 C 600,500 700,200 900,200 C 1100,200 1150,500 950,500 C 800,500 850,350 1050,450 C 1200,500 1400,550 1650,550 C 1900,550 2100,750 2300,750 C 2500,750 2550,550 2350,550 C 2200,550 2250,680 2450,650 C 2650,620 2750,420 2950,420 C 3200,420 3350,250 3550,250 C 3750,250 3800,450 3600,450 C 3450,450 3500,300 3700,380 C 3850,420 4050,500 4250,500 L 5200,500"
                fill="none"
                stroke="rgba(255,255,255,0.18)"
                strokeWidth="0.75"
                transform="translate(0, -23)"
              />

              {/* 5. Fine Bottom Shadow Lip (translated 23px) */}
              <path
                d="M 100,120 C 220,120 280,250 200,250 C 120,250 100,180 180,350 C 240,420 200,500 350,500 C 600,500 700,200 900,200 C 1100,200 1150,500 950,500 C 800,500 850,350 1050,450 C 1200,500 1400,550 1650,550 C 1900,550 2100,750 2300,750 C 2500,750 2550,550 2350,550 C 2200,550 2250,680 2450,650 C 2650,620 2750,420 2950,420 C 3200,420 3350,250 3550,250 C 3750,250 3800,450 3600,450 C 3450,450 3500,300 3700,380 C 3850,420 4050,500 4250,500 L 5200,500"
                fill="none"
                stroke="rgba(0,0,0,0.45)"
                strokeWidth="0.75"
                transform="translate(0, 23)"
              />
            </g>
          </svg>
        </div>

        {eventsData.map((event, i) => {
          const isEven = i % 2 === 0;

          // Spaced-out, editorial layout of 6 sharp-edged photos (rounded-none)
          // Spread across a 55vw container, overlapping slightly but not clustered
          const imgPositions = [
            'top-[2%] left-[0%] w-[27%] aspect-[3/4]',   // Image 0 (Left top)
            'top-[8%] left-[30%] w-[25%] aspect-[1/1]',  // Image 1 (Center top)
            'top-[38%] left-[6%] w-[26%] aspect-[4/3]',  // Image 2 (Left bottom)
            'top-[44%] left-[33%] w-[28%] aspect-[3/4]',  // Image 3 (Center bottom)
            'top-[10%] left-[58%] w-[24%] aspect-[1/1]',  // Image 4 (Right top)
            'top-[46%] left-[69%] w-[27%] aspect-[4/3]',  // Image 5 (Right bottom)
          ];

          return (
            <div
              key={i}
              ref={(el) => { slideRefs.current[i] = el; }}
              className="event-slide-wrapper h-screen flex-shrink-0 flex items-center relative overflow-hidden"
            >
              
              {/* Foreground Bold White Events Title - nested inside Slide 0 so it scrolls past naturally */}
              {i === 0 && (
                <div className={`absolute top-[12vh] left-[10vw] z-40 ${cormorantGaramond.className} font-light italic text-6xl md:text-8xl lg:text-[7.5rem] xl:text-[9rem] text-white tracking-wider select-none pointer-events-none leading-none`}>
                  Events
                </div>
              )}

              {/* Event Timeline Node (Metallic brass rivet dot on the tape) - shifted to 35vw */}
              <div
                className="timeline-node-dot absolute w-4 h-4 rounded-full z-30 shadow-[0_4px_8px_rgba(0,0,0,0.8)]"
                style={{
                  left: "35vw",
                  top: `${nodeHeights[i]}%`,
                  transform: "translate(-50%, -50%)",
                  background: "radial-gradient(circle, #ffffff 0%, #FCD34D 35%, #D97706 75%, #78350F 100%)",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.85), inset 0 1px 2px rgba(255,255,255,0.4)"
                }}
              />

              {/* Vertical link line connecting the rivet dot to the text details (Alternating) - shifted to 35vw */}
              <div
                className={`timeline-node-line absolute w-[1.5px] bg-gradient-to-b ${
                  isEven
                    ? "from-[#D97706]/40 to-zinc-800"
                    : "from-zinc-800 to-[#D97706]/40"
                }`}
                style={{
                  left: "35vw",
                  top: isEven ? `${nodeHeights[i]}%` : `calc(${nodeHeights[i]}% - 17vh)`,
                  height: "17vh",
                }}
              />

              {/* Date Label: Positioned above or below the node path (Alternating) - shifted to 35vw */}
              <div
                className="event-date absolute text-zinc-500 text-xs md:text-sm font-semibold tracking-widest uppercase flex flex-col gap-0.5 opacity-0 z-20"
                style={{
                  left: "35vw",
                  top: isEven
                    ? `calc(${nodeHeights[i]}% - 6.5vh)`
                    : `calc(${nodeHeights[i]}% + 6.5vh)`,
                  transform: "translateY(-50%)",
                }}
              >
                <span className="text-white/80">{event.date}</span>
                <span className="text-[10px] text-zinc-600 tracking-wider font-light">{event.time}</span>
              </div>

              {/* Typography block below or above the vertical connector (Alternating) - shifted to 35vw */}
              <div
                className="absolute w-[32vw] flex flex-col justify-start z-20"
                style={{
                  left: "35vw",
                  top: isEven
                    ? `calc(${nodeHeights[i]}% + 18vh)`
                    : `calc(${nodeHeights[i]}% - 48vh)`,
                }}
              >
                <div className={`${inter.className} flex flex-col gap-4 md:gap-5`}>
                  {/* Category Badge */}
                  <span className="event-category text-[10px] md:text-xs font-semibold tracking-[0.25em] text-zinc-500 uppercase opacity-0">
                    {event.category}
                  </span>

                  {/* Title */}
                  <h2 className={`event-title ${cormorantGaramond.className} text-5xl md:text-6xl lg:text-[4.5rem] xl:text-[5.5rem] font-light italic tracking-tight text-white leading-[0.95] opacity-0`}>
                    {event.title}
                  </h2>

                  {/* Description */}
                  <p className="event-desc text-zinc-400 font-light text-sm md:text-base leading-relaxed tracking-wide opacity-0">
                    {event.description}
                  </p>

                  {/* CTA Button */}
                  <div className="event-cta pt-1 opacity-0">
                    <a
                      href="#footer"
                      className="group relative inline-flex items-center text-white text-xs font-semibold tracking-widest uppercase transition-all duration-300 py-1"
                    >
                      <span>Learn More</span>
                      <span className="ml-2 transform group-hover:translate-x-1.5 transition-transform duration-300">→</span>
                      <span className="absolute bottom-0 left-0 w-0 h-px bg-white group-hover:w-full transition-all duration-300" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Spaced-Out Gallery: Pictures arranged closer to the text details (left: 60vw for balanced offset) */}
              <div
                className="collage-container absolute left-[60vw] w-[55vw] h-[70vh] z-20 pointer-events-none"
                style={{
                  top: isEven ? "15vh" : "25vh",
                }}
              >
                {event.images.map((imgUrl, imgIdx) => (
                  <div
                    key={imgIdx}
                    className={`img-wrapper absolute ${imgPositions[imgIdx]} rounded-none overflow-hidden shadow-2xl transition-shadow duration-500 hover:shadow-white/5 opacity-0 pointer-events-auto`}
                  >
                    <img
                      src={imgUrl}
                      alt={`${event.title} detail ${imgIdx + 1}`}
                      loading="lazy"
                      className="floating-img w-full h-full object-cover select-none pointer-events-none"
                    />
                  </div>
                ))}
              </div>

            </div>
          );
        })}
      </div>

      {/* Styled Embed blocks for CSS keyframe animations, textures & vignettes */}
      <style jsx global>{`
        /* Vignette gradient */
        .bg-radial-vignette {
          background: radial-gradient(circle at 50% 50%, #151518 0%, #070708 100%);
        }

        /* SVG noise grain overlay */
        .film-grain-custom {
          background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 250 250' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        /* Spaced-Out Slides: 130vw horizontal width per event on desktop */
        .event-slide-wrapper {
          width: 130vw;
        }

        /* Float loops on inner image tags to keep scene alive */
        .animate-float-gentle-0 { animation: float-0 18s ease-in-out infinite; }
        .animate-float-gentle-1 { animation: float-1 22s ease-in-out infinite; }
        .animate-float-gentle-2 { animation: float-2 20s ease-in-out infinite; }
        .animate-float-gentle-3 { animation: float-3 24s ease-in-out infinite; }

        @keyframes float-0 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(4px, -8px, 0) rotate(1deg); }
        }
        @keyframes float-1 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(-6px, 6px, 0) rotate(-0.5deg); }
        }
        @keyframes float-2 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
          50% { transform: translate3d(6px, 5px, 0) rotate(0.5deg); }
        }
        @keyframes float-3 {
          0%, 100% { transform: translate3d(0, 0, 0) rotate(-1deg); }
          50% { transform: translate3d(-4px, -7px, 0) rotate(-1deg); }
        }

        /* Force smooth layout on pinned elements */
        .animate-pin-fix {
          will-change: transform;
          backface-visibility: hidden;
        }

        /* Responsive stack layout on small mobile screens */
        @media (max-width: 1023px) {
          .event-slide-wrapper {
            width: 100vw !important;
          }
          .timeline-node-dot,
          .timeline-node-line {
            display: none;
          }
          .collage-container {
            width: 80vw !important;
            right: 10vw !important;
            left: 10vw !important;
            height: 32vh !important;
            top: 52vh !important;
          }
          .absolute.left-\[35vw\] {
            left: 10vw !important;
            width: 80vw !important;
            top: 15vh !important;
          }
          .event-date {
            left: 10vw !important;
            top: 8vh !important;
          }
        }
      `}</style>
    </div>
  );
}
