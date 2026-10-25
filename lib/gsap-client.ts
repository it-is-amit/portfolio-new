"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

let registered = false;

export function registerGsapPlugins(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger);
  registered = true;
}

/** Shared timing for the section-heading blur reveal, so every heading enters the same way. */
export const HEADING_REVEAL = {
  /** Fires as the heading crosses into the lower part of the viewport, not once it is mid-screen. */
  start: "top 88%",
  y: 22,
  blur: 12,
  duration: 0.9,
  ease: "power3.out",
} as const;

/**
 * Blur-to-focus entrance for section headings: blur → sharp, transparent → opaque, a small rise.
 * - Plays once per mount (`once: true`), so scrolling back and forth never replays it.
 * - Hidden state is applied by JS only; server HTML (and any no-JS / failed-JS case) stays visible.
 * - Uses opacity, not visibility, so the heading stays in the accessibility tree throughout.
 * - Clears its inline styles when done (no lingering `filter` layer), and `context.revert()`
 *   restores the natural, visible state on unmount.
 * Callers skip it entirely under `prefers-reduced-motion`.
 */
export function revealSectionHeading(heading: HTMLElement, start: string = HEADING_REVEAL.start) {
  return gsap.fromTo(
    heading,
    { y: HEADING_REVEAL.y, opacity: 0, filter: `blur(${HEADING_REVEAL.blur}px)` },
    {
      y: 0,
      opacity: 1,
      filter: "blur(0px)",
      duration: HEADING_REVEAL.duration,
      ease: HEADING_REVEAL.ease,
      clearProps: "transform,opacity,filter",
      scrollTrigger: { trigger: heading, start, once: true },
    },
  );
}

export { gsap, ScrollTrigger };
