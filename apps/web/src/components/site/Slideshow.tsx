"use client";

import Image from "next/image";
import { useEffect, useState, useSyncExternalStore } from "react";

const REDUCED = "(prefers-reduced-motion: reduce)";
const prefersReducedMotion = () => !!window.matchMedia?.(REDUCED).matches;
function subscribeReducedMotion(cb: () => void) {
  const m = window.matchMedia?.(REDUCED);
  m?.addEventListener("change", cb);
  return () => m?.removeEventListener("change", cb);
}

export interface Slide {
  file: string;
  alt: string;
  position?: string;
}

/**
 * Home page slideshow: starts with the first photo and moves on every 5 seconds. Visitors can pause it
 * (an accessibility requirement for moving content), and it starts paused for people whose device
 * asks for reduced motion. Only the photo on screen is exposed to screen readers.
 */
export function Slideshow({ slides, interval = 5000 }: { slides: Slide[]; interval?: number }) {
  const [i, setI] = useState(0);
  const reduced = useSyncExternalStore(subscribeReducedMotion, prefersReducedMotion, () => false);
  const [choice, setChoice] = useState<boolean | null>(null); // the visitor's own Pause/Play choice
  const paused = choice ?? reduced;
  useEffect(() => {
    if (paused || slides.length < 2) return;
    const t = setInterval(() => {
      if (!document.hidden) setI((x) => (x + 1) % slides.length);
    }, interval);
    return () => clearInterval(t);
  }, [paused, slides.length, interval]);

  return (
    <section className="slideshow" aria-roledescription="carousel" aria-label="Photos">
      <div className="slides" style={{ transform: `translateX(-${i * 100}%)` }}>
        {slides.map((s, j) => (
          <div
            key={s.file + j}
            className="slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${j + 1} of ${slides.length}`}
            aria-hidden={j === i ? undefined : true}
          >
            <Image
              src={`/photos/${s.file}`}
              alt={s.alt}
              fill
              priority={j === 0}
              sizes="(max-width: 1200px) 100vw, 1200px"
              style={s.position ? { objectPosition: s.position } : undefined}
            />
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <div className="slide-ctl">
          <button type="button" className="slide-play" aria-pressed={paused} onClick={() => setChoice(!paused)}>
            {paused ? "Play" : "Pause"}
          </button>
          {slides.map((_, j) => (
            <button
              key={j}
              type="button"
              className="slide-dot"
              aria-label={`Show photo ${j + 1}`}
              aria-current={j === i ? "true" : undefined}
              onClick={() => setI(j)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
