'use client';

import React, { useState } from 'react';
import { CouncilMember } from './councilData';

interface WindowsPictureViewerProps {
  allMembers: CouncilMember[];
  onClose?: () => void;
  onMinimize?: () => void;
}

export default function WindowsPictureViewer({
  allMembers,
  onClose,
  onMinimize,
}: WindowsPictureViewerProps) {
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);

  const handleZoomIn = () => setZoomLevel((prev) => Math.min(prev + 0.25, 2));
  const handleZoomOut = () => setZoomLevel((prev) => Math.max(prev - 0.25, 0.5));
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);
  const handleReset = () => {
    setZoomLevel(1);
    setRotation(0);
  };

  return (
    <div className="xp-picture-viewer">
      {/* Classic Windows Picture and Fax Viewer Titlebar */}
      <div className="msn-titlebar xp-pv-titlebar">
        <div className="msn-titlebar-left">
          <span className="xp-pv-icon">🖼️</span>
          <span className="msn-title-text">
            GDG_CRCE_Council_2026-27_Group_Photo.jpg — Windows Picture and Fax Viewer
          </span>
        </div>
        <div className="msn-titlebar-buttons">
          <button
            type="button"
            className="xp-btn-win xp-btn-min"
            onClick={onMinimize}
            title="Minimize"
          >
            _
          </button>
          <button
            type="button"
            className="xp-btn-win xp-btn-max"
            onClick={handleReset}
            title="Reset Zoom & Fit to Window"
          >
            □
          </button>
          <button
            type="button"
            className="xp-btn-win xp-btn-close"
            onClick={onClose}
            title="Close"
          >
            ×
          </button>
        </div>
      </div>

      {/* Main Central Photo Viewport */}
      <div className="xp-pv-viewport">
        <div
          className="xp-pv-image-canvas"
          style={{
            transform: `scale(${zoomLevel}) rotate(${rotation}deg)`,
            transition: 'transform 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)',
          }}
        >
          {/* Header Banner */}
          <div className="xp-pv-group-header">
            <h2 className="xp-pv-group-title">GDG_CRCE_Council_2026-27_Group_Photo.bmp</h2>
            <p className="xp-pv-group-subtitle">Dimensions: 1400 x 800 • 24-bit color</p>
          </div>

          {/* Polaroid Group Collage Grid */}
          <div className="xp-pv-collage-grid">
            {allMembers.map((member) => (
              <div key={member.id} className="xp-pv-polaroid-card">
                <div
                  className="xp-pv-polaroid-photo"
                  style={{ background: member.avatarBg }}
                >
                  <span className="xp-pv-polaroid-glyph">{member.avatarIcon}</span>
                  <div className="xp-pv-polaroid-team-tag">{member.team}</div>
                </div>
                <div className="xp-pv-polaroid-caption">
                  <strong>{member.name}</strong>
                  <span>{member.role}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Footer Watermark */}
          <div className="xp-pv-watermark">
            <span>📷 Windows Picture and Fax Viewer — High Resolution Archive</span>
            <span>File Size: 14 Members • Dimensions: 4K • Color Space: sRGB</span>
          </div>
        </div>
      </div>

      {/* Classic Bottom Circular/Oval Action Toolbar */}
      <div className="xp-pv-toolbar">
        <div className="xp-pv-toolbar-group">
          <button
            type="button"
            className="xp-pv-btn"
            onClick={handleZoomOut}
            title="Zoom Out (-)"
          >
            <span className="xp-pv-icon-img">🔎➖</span>
          </button>
          <span className="xp-pv-zoom-indicator">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            className="xp-pv-btn"
            onClick={handleZoomIn}
            title="Zoom In (+)"
          >
            <span className="xp-pv-icon-img">🔎➕</span>
          </button>
        </div>

        <div className="xp-pv-toolbar-divider" />

        <div className="xp-pv-toolbar-group">
          <button
            type="button"
            className="xp-pv-btn"
            onClick={handleReset}
            title="Actual Size / Best Fit"
          >
            <span className="xp-pv-icon-img">🖼️</span>
          </button>
          <button
            type="button"
            className="xp-pv-btn"
            onClick={handleRotate}
            title="Rotate Clockwise (Ctrl+K)"
          >
            <span className="xp-pv-icon-img">↻</span>
          </button>
        </div>

        <div className="xp-pv-toolbar-divider" />

        <div className="xp-pv-toolbar-group">
          <button
            type="button"
            className="xp-pv-btn"
            onClick={() => window.print()}
            title="Print this picture (Ctrl+P)"
          >
            <span className="xp-pv-icon-img">🖨️</span>
          </button>
          <button
            type="button"
            className="xp-pv-btn"
            onClick={handleReset}
            title="Copy to Clipboard"
          >
            <span className="xp-pv-icon-img">📋</span>
          </button>
        </div>
      </div>
    </div>
  );
}
