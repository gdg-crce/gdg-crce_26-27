'use client';

import React from 'react';
import Image from 'next/image';
import './contact.css';

export default function ContactSection() {
  return (
    <footer id="contact" className="contact-section" aria-label="GDG CRCE Contact Footer">
      <div className="contact-adam-container">
        {/* Left hand reaches from the bottom-left and touches the logo */}
        <Image
          src="/contact/left.png"
          className="contact-hand contact-hand-left"
          alt="Left Hand"
          width={500}
          height={500}
          sizes="60vw"
          draggable={false}
        />

        {/* Central Logo wrapped in mailto link */}
        <a href="mailto:gdg.crce@gmail.com" className="contact-logo-wrapper" title="Email GDG CRCE">
          <Image src="/logo.png" className="contact-logo" alt="GDG Logo" width={612} height={408} sizes="(max-width: 480px) 100px, (max-width: 768px) 160px, 220px" />
        </a>

        {/* Right hand reaches from the top-right and touches the logo */}
        <Image
          src="/contact/right.png"
          className="contact-hand contact-hand-right"
          alt="Right Hand"
          width={500}
          height={500}
          sizes="60vw"
          draggable={false}
        />
      </div>
    </footer>
  );
}
