"use client";

import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

/*
 * cssVars: tweens numeric CSS custom properties, e.g. `{ cssVars: { "--cap-o": 1 } }`.
 *
 * GSAP's CSSPlugin reads a custom property's start value with getComputedStyle whenever a tween
 * starts. On a long scrubbed timeline those starts happen mid-frame, right after other tweens have
 * written styles, so every one forces a full style recalculation of the section. This plugin takes
 * the start value from the element's inline style instead (where the previous tween on that property
 * left it), then from a value read up front by seedCssVars(), and only then from getComputedStyle.
 * Values are unitless numbers. clearCssVars() removes everything it wrote (call it on cleanup).
 */
type StyledElement = HTMLElement | SVGElement;

const cssVarSeeds = new WeakMap<Element, Map<string, number>>();
const cssVarsWritten = new Map<StyledElement, Set<string>>();

function isStyledElement(target: unknown): target is StyledElement {
  return typeof Element !== "undefined" && target instanceof Element && "style" in target;
}

function cssVarStart(target: StyledElement, name: string): number {
  const inline = Number.parseFloat(target.style.getPropertyValue(name));
  if (!Number.isNaN(inline)) return inline;
  const seeded = cssVarSeeds.get(target)?.get(name);
  if (seeded !== undefined) return seeded;
  return Number.parseFloat(getComputedStyle(target).getPropertyValue(name)) || 0;
}

const CssVarsPlugin: gsap.Plugin = {
  name: "cssVars",
  init(target, values: Record<string, number>) {
    if (!isStyledElement(target)) return;
    let names = cssVarsWritten.get(target);
    if (!names) cssVarsWritten.set(target, (names = new Set()));
    for (const name of Object.keys(values)) {
      // style.setProperty(name, value) on every render, exactly like CSSPlugin's own custom-property path.
      this.add(target.style, "setProperty", cssVarStart(target, name), Number(values[name]), 0, 0, 0, 0, name);
      this._props.push(name);
      names.add(name);
    }
  },
};

/**
 * Reads the current CSS value of each (element, custom property) pair in one pass, before any tween
 * writes a style, so the whole batch costs a single style recalculation instead of one per tween.
 */
export function seedCssVars(pairs: Iterable<readonly [Element, string]>): void {
  const computed = new Map<Element, CSSStyleDeclaration>();
  for (const [element, name] of pairs) {
    let style = computed.get(element);
    if (!style) computed.set(element, (style = getComputedStyle(element)));
    let seeds = cssVarSeeds.get(element);
    if (!seeds) cssVarSeeds.set(element, (seeds = new Map()));
    seeds.set(name, Number.parseFloat(style.getPropertyValue(name)) || 0);
  }
}

/** Removes every custom property the cssVars plugin wrote inside `root` (inclusive) and forgets their seeds. */
export function clearCssVars(root: Element): void {
  for (const [element, names] of cssVarsWritten) {
    if (!root.contains(element)) continue;
    names.forEach((name) => element.style.removeProperty(name));
    cssVarsWritten.delete(element);
    cssVarSeeds.delete(element);
  }
}

let registered = false;

export function registerGsapPlugins(): void {
  if (registered) return;
  gsap.registerPlugin(ScrollTrigger, CssVarsPlugin);
  registered = true;
}

/** Shared timing for the section-heading blur reveal, so every heading enters the same way. */
const HEADING_REVEAL = {
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
