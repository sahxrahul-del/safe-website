"use client";

import { useState, useEffect } from 'react';

export default function CustomCursor() {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const moveCursor = (e) => {
      setPosition({ x: e.clientX, y: e.clientY });
      if (!isVisible) setIsVisible(true);
    };

    const handleHover = (e) => {
      if (
        e.target.tagName.toLowerCase() === 'button' || 
        e.target.tagName.toLowerCase() === 'a' || 
        e.target.closest('button') || 
        e.target.closest('a')
      ) {
        setIsHovering(true);
      } else {
        setIsHovering(false);
      }
    };

    window.addEventListener('mousemove', moveCursor);
    window.addEventListener('mouseover', handleHover);

    return () => {
      window.removeEventListener('mousemove', moveCursor);
      window.removeEventListener('mouseover', handleHover);
    };
  }, [isVisible]);

  if (!isVisible) return null;

  return (
    <>
      {/* The Solid Center Dot */}
      <div 
        className="fixed top-0 left-0 w-1.5 h-1.5 bg-emerald-600 rounded-full pointer-events-none z-[9999] transition-transform duration-100 ease-out"
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)' 
        }}
      />
      {/* The Outer Following Ring */}
      <div 
        className={`fixed top-0 left-0 rounded-full pointer-events-none z-[9998] transition-all duration-300 ease-out border ${
          isHovering 
            ? 'w-12 h-12 border-emerald-400 bg-emerald-400/10 scale-125' 
            : 'w-8 h-8 border-emerald-500/50'
        }`}
        style={{ 
          left: `${position.x}px`, 
          top: `${position.y}px`,
          transform: 'translate(-50%, -50%)' 
        }}
      />
    </>
  );
}