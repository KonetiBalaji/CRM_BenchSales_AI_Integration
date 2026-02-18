'use client';

/**
 * Lazy Load Component
 * Implements intersection observer for lazy loading
 */

import React, { useEffect, useRef, useState } from 'react';

interface LazyLoadProps {
  children: React.ReactNode;
  placeholder?: React.ReactNode;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
}

export function LazyLoad({
  children,
  placeholder = <div>Loading...</div>,
  rootMargin = '50px',
  threshold = 0.01,
  onLoad,
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          onLoad?.();
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold, onLoad]);

  return (
    <div ref={containerRef}>
      {isVisible ? children : placeholder}
    </div>
  );
}
