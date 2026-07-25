'use client';

import React from 'react';
import './contact.css';

export default function ContactSection() {
  return (
    <footer id="contact" className="contact-section" aria-label="GDG CRCE Contact Footer">
      <div className="contact-adam-container">
        {/* Left hand reaches from the bottom-left and touches the logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/contact/left.png"
          className="contact-hand contact-hand-left"
          alt="Left Hand"
          decoding="async"
          draggable={false}
        />

        {/* Central Logo wrapped in mailto link */}
        <a href="mailto:gdg.crce@gmail.com" className="contact-logo-wrapper" title="Email GDG CRCE">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" className="contact-logo" alt="GDG Logo" decoding="async" />
        </a>

        {/* Right hand reaches from the top-right and touches the logo */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/contact/right.png"
          className="contact-hand contact-hand-right"
          alt="Right Hand"
          decoding="async"
          draggable={false}
        />
      </div>
    </footer>
  );
}
