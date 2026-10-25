"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { ArrowDown } from "lucide-react";
import { CapabilityPreview } from "@/components/CapabilityPreview";
import { useLenis } from "@/components/SmoothScrollProvider";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { capabilityStages, copy, type CapabilityStage } from "@/data/profile";
import { gsap, registerGsapPlugins, revealSectionHeading, ScrollTrigger } from "@/lib/gsap-client";

/*
 * Showcase: one centred composition (heading, subtitle, stage timeline, large website preview)
 * inside a tall `.cap` wrapper whose child is `position: sticky`. It slides up over the exiting
 * hero, pins, and one scrubbed GSAP timeline maps the wrapper's scroll progress (0 → 1) onto CSS
 * custom properties read by the preview and the ambient background. Native sticky (no GSAP
 * pin-spacer) keeps it friendly with Lenis and the neighbouring ScrollTriggers. Reduced motion or
 * short viewports get a static, button-driven version.
 */
const SCROLL_JOURNEY_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 600px)";
/** Timeline unit at which each stage begins (index 0 = stage 1). The timeline is 10 units long. */
const STAGE_UNITS = [0, 1.7, 4.7, 8] as const;
/** Scroll progress at which each stage begins. */
const STAGE_STARTS = STAGE_UNITS.map((unit) => unit / 10);
/** Progress used when a stage button is pressed: the settled "hold" inside each stage. */
const STAGE_FOCUS = [0.15, 0.44, 0.78, 0.97] as const;

function subscribeToQuery(query: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
}

const subscribeToJourneyQuery = subscribeToQuery(SCROLL_JOURNEY_QUERY);
const getJourneySnapshot = () => typeof window !== "undefined" && window.matchMedia(SCROLL_JOURNEY_QUERY).matches;
const getJourneyServerSnapshot = () => false;

function stageFromProgress(progress: number): CapabilityStage {
  if (progress >= STAGE_STARTS[3]) return 4;
  if (progress >= STAGE_STARTS[2]) return 3;
  if (progress >= STAGE_STARTS[1]) return 2;
  return 1;
}

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const scrollStageRef = useRef<CapabilityStage>(1);
  const reducedMotion = usePrefersReducedMotion();
  const scrollMode = useSyncExternalStore(subscribeToJourneyQuery, getJourneySnapshot, getJourneyServerSnapshot);
  const lenis = useLenis();
  const [scrollStage, setScrollStage] = useState<CapabilityStage>(1);
  const [staticStage, setStaticStage] = useState<CapabilityStage>(4);
  const stage = scrollMode ? scrollStage : staticStage;

  // Heading reveal lives in its own effect so a journey-mode change (e.g. a resize across the
  // 600px height threshold) never replays it.
  useLayoutEffect(() => {
    const heading = sectionRef.current?.querySelector<HTMLElement>("#services-title");
    if (!heading || reducedMotion) return;
    registerGsapPlugins();
    const context = gsap.context(() => {
      revealSectionHeading(heading);
    });
    return () => context.revert();
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const journey = journeyRef.current;
    if (!section || !journey) return;

    registerGsapPlugins();
    let refreshFrame = 0;
    const cleanups: Array<() => void> = [];
    const context = gsap.context(() => {
      if (!scrollMode) return;

      const preview = journey.querySelector<HTMLElement>("[data-cap-preview]");
      const figure = journey.querySelector<HTMLElement>(".cap__figure");
      const inner = journey.querySelector<HTMLElement>(".cap__inner");
      const head = journey.querySelector<HTMLElement>(".cap-head");
      const timelineWrap = journey.querySelector<HTMLElement>(".cap-timeline-wrap");
      const stageEl = journey.querySelector<HTMLElement>(".cap__stage");
      const all = (selector: string) => gsap.utils.toArray<HTMLElement>(selector, journey);
      const fx = (...names: string[]) => all(names.map((name) => `[data-cap-fx="${name}"]`).join(","));
      const slots = { type: all('[data-cap-slot="type"]'), control: all('[data-cap-slot="control"]'), image: all('[data-cap-slot="image"]') };
      const builds = all("[data-cap-build]");
      const regions = all("[data-cap-region]");
      if (!preview || !figure || !inner || !head || !timelineWrap || !stageEl || !builds.length) return;

      // --cap-shift: if heading + timeline + preview don't fit one viewport, the sticky element's top
      // goes negative by the heading block's height, so the heading arrives with the preview and then
      // scrolls away while the timeline and preview pin. If everything fits, nothing scrolls away.
      // Re-measured before every ScrollTrigger refresh (resize, font load, orientation change).
      let shift = 0;
      const measureShift = () => {
        journey.style.setProperty("--cap-shift", "0px");
        const styles = getComputedStyle(inner);
        const padTop = Number.parseFloat(styles.paddingTop) || 0;
        const padBottom = Number.parseFloat(styles.paddingBottom) || 0;
        const overflow = stageEl.offsetTop + stageEl.offsetHeight + padBottom - inner.clientHeight;
        shift = overflow > 0 ? Math.max(0, Math.round(timelineWrap.offsetTop - padTop)) : 0;
        journey.style.setProperty("--cap-shift", `${shift}px`);
        journey.dataset.fit = shift > 0 ? "preview" : "all";
      };
      measureShift();
      ScrollTrigger.addEventListener("refreshInit", measureShift);
      cleanups.push(() => {
        ScrollTrigger.removeEventListener("refreshInit", measureShift);
        journey.style.removeProperty("--cap-shift");
        delete journey.dataset.fit;
      });

      // The heading hands over to the preview: it softens and fades while it scrolls away.
      gsap.fromTo(
        head,
        { opacity: 1, filter: "blur(0px)" },
        {
          opacity: () => (shift > 0 ? 0 : 1),
          filter: () => (shift > 0 ? "blur(8px)" : "blur(0px)"),
          ease: "power1.in",
          scrollTrigger: { trigger: journey, start: "top top", end: () => `+=${Math.max(1, shift)}`, scrub: true, invalidateOnRefresh: true },
        },
      );

      // Arrival: while the section slides up over the exiting hero, the preview rises into its
      // pinned position a little faster than the page (a child of the sticky element, never the
      // sticky element itself, so native sticky is untouched).
      gsap.fromTo(
        figure,
        { y: () => window.innerHeight * 0.12, scale: 0.94 },
        {
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: journey, start: "top bottom", end: "top top", scrub: true, invalidateOnRefresh: true },
        },
      );

      // Entry: the layout regions (grid, nav rule, hero frame, project band) draw in while the
      // section scrolls into place, so the very first scroll already moves the preview.
      gsap.fromTo(
        regions,
        { "--cap-r": 0 },
        {
          "--cap-r": 1,
          ease: "none",
          stagger: 0.18,
          scrollTrigger: { trigger: journey, start: "top 88%", end: "top 18%", scrub: true },
        },
      );

      // The journey's starting frame lives in CSS (`.cap[data-mode="scroll"] …` in globals.css), so
      // every tween below reads its start value from there and never needs a gsap.set().

      const syncStage = (progress: number) => {
        const next = stageFromProgress(progress);
        if (next === scrollStageRef.current) return;
        scrollStageRef.current = next;
        setScrollStage(next);
      };

      // One timeline, 10 units long: unit / 10 = scroll progress (see STAGE_STARTS / STAGE_FOCUS).
      // Every value below is scrubbed by scroll position, so pausing, reversing and jumping all
      // land on the exact matching frame. No timers, no React state per frame.
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: journey,
          // The build starts the moment the preview pins (after the heading has scrolled away).
          start: () => `top+=${shift} top`,
          end: "bottom bottom",
          scrub: 0.35,
          invalidateOnRefresh: true,
          onUpdate: (self) => syncStage(self.progress),
        },
      });
      const show = (targets: HTMLElement[], at: number, duration = 0.22) =>
        timeline.to(targets, { "--cap-o": 1, duration }, at);
      const hide = (targets: HTMLElement[], at: number, duration = 0.22, stagger = 0) =>
        timeline.to(targets, { "--cap-o": 0, duration, stagger }, at);

      // Progress rail: piecewise, so the marker reaches each step exactly when its stage begins.
      timeline
        .to(journey, { "--cap-p": 0.25, duration: STAGE_UNITS[1] }, 0)
        .to(journey, { "--cap-p": 0.5, duration: STAGE_UNITS[2] - STAGE_UNITS[1] }, STAGE_UNITS[1])
        .to(journey, { "--cap-p": 0.75, duration: STAGE_UNITS[3] - STAGE_UNITS[2] }, STAGE_UNITS[2])
        .to(journey, { "--cap-p": 1, duration: 10 - STAGE_UNITS[3] }, STAGE_UNITS[3])
        // The scroll cue hands over to the moving marker once the wireframe is underway.
        .to(journey, { "--cap-cue": 0, duration: 0.9 }, 0.25);

      // 01 · Wireframe (0 → 1.7): structure is placed piece by piece.
      const build = (group: string, at: number, stagger = 0) =>
        timeline.to(all(`[data-cap-build="${group}"]`), { "--cap-b": 1, duration: 0.3, ease: "power2.out", stagger }, at);
      build("nav", 0.05, 0.06);
      build("title", 0.3);
      build("copy", 0.42, 0.07);
      build("media", 0.55);
      build("actions", 0.72);
      build("head", 0.86, 0.06);
      build("card", 0.95, 0.09);
      show(fx("flow"), 1.15, 0.3);

      // 02 · UI design (1.7 → 4.7): type, then colour, then imagery, then refinement.
      hide(fx("label", "frame", "flow"), 1.7, 0.3);
      timeline
        .to(preview, { "--cap-grid": 0, duration: 1.4 }, 1.75)
        .to(slots.type, { "--cap-t": 1, duration: 0.45, ease: "power2.inOut", stagger: { amount: 0.75 } }, 1.7)
        // Background state 02: white wireframe paper → warm design surface (03 and 04 follow below).
        .to(preview, { "--cap-c": 1, duration: 0.85, ease: "power1.inOut" }, 2.35)
        .to(slots.control, { "--cap-t": 1, duration: 0.45, ease: "power2.inOut", stagger: { amount: 0.3 } }, 2.5)
        .to(slots.image, { "--cap-t": 1, duration: 0.5, ease: "power2.inOut", stagger: { amount: 0.35 } }, 2.95)
        .to(preview, { "--cap-d": 1, duration: 0.8, ease: "power1.inOut" }, 3.55);
      show(fx("select"), 2.0);
      show(fx("tag"), 2.8);
      show(fx("redline"), 3.7);
      hide(fx("select", "tag", "redline"), 4.5, 0.25);

      // 03 · Frontend (4.7 → 8): components register one by one, then real states are exercised.
      // Background state 03: a cool, lavender-tinted build surface.
      timeline.to(preview, { "--cap-s3": 1, duration: 0.9, ease: "power1.inOut" }, 4.75);
      show(fx("outline-nav"), 4.8, 0.25);
      timeline.to(preview, { "--cap-nav": 1, duration: 0.3 }, 4.85);
      show(fx("toast"), 4.95, 0.25);
      show(fx("outline-hero"), 5.1, 0.25);
      show(fx("outline-projects"), 5.4, 0.25);
      timeline
        .to(preview, { "--cap-cur": 1, duration: 0.2 }, 5.55)
        .to(preview, { "--cap-cx": 632, "--cap-cy": 32, duration: 0.5, ease: "power2.inOut" }, 5.55)
        .to(preview, { "--cap-hn": 1, duration: 0.15 }, 6.0)
        .to(preview, { "--cap-cx": 100, "--cap-cy": 300, duration: 0.6, ease: "power2.inOut" }, 6.25)
        .to(preview, { "--cap-hn": 0, duration: 0.15 }, 6.3)
        .to(preview, { "--cap-press": 1, duration: 0.17 }, 6.88)
        .to(preview, { "--cap-press": 0, duration: 0.17 }, 7.08)
        .to(preview, { "--cap-cx": 498, "--cap-cy": 474, duration: 0.5, ease: "power2.inOut" }, 7.3)
        .to(preview, { "--cap-lift": 1, duration: 0.23 }, 7.72);

      // 04 · Final product (8 → 10): tooling steps away, depth and the responsive view arrive.
      hide(fx("toast"), 7.9, 0.2);
      hide(fx("outline-projects", "outline-hero", "outline-nav"), 8.0, 0.25, 0.08);
      timeline
        .to(preview, { "--cap-cur": 0, "--cap-lift": 0, duration: 0.3 }, 8.0)
        .to(preview, { "--cap-ship": 1, duration: 0.8, ease: "power2.out" }, 8.25)
        // Background state 04: the launch palette (violet and champagne light).
        .to(preview, { "--cap-s4": 1, duration: 1, ease: "power1.inOut" }, 8.1);
      timeline.to(fx("phone"), { "--cap-o": 1, duration: 0.8, ease: "power2.out" }, 8.7);

      timeline.to({}, { duration: 0.01 }, 9.99);

      triggerRef.current = timeline.scrollTrigger ?? null;
      syncStage(timeline.scrollTrigger?.progress ?? 0);
    }, section);

    // The journey changes page height, so neighbouring triggers need fresh measurements.
    refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.cancelAnimationFrame(refreshFrame);
      triggerRef.current = null;
      cleanups.forEach((cleanup) => cleanup());
      context.revert();
    };
  }, [reducedMotion, scrollMode]);

  const goToStage = useCallback((next: CapabilityStage) => {
    if (!scrollMode) {
      setStaticStage(next);
      return;
    }
    const trigger = triggerRef.current;
    if (!trigger) return;
    const target = trigger.start + (trigger.end - trigger.start) * STAGE_FOCUS[next - 1];
    if (lenis) lenis.scrollTo(target, { duration: 1.2 });
    else window.scrollTo({ top: target, behavior: "smooth" });
  }, [lenis, scrollMode]);

  return (
    <section
      className="section-services relative overflow-x-clip bg-[var(--surface-warm)] pb-[clamp(48px,6vw,96px)] text-[var(--midnight-ink)]"
      id="what-i-do"
      ref={sectionRef}
      aria-labelledby="services-title"
    >
      <div className="cap" ref={journeyRef} data-mode={scrollMode ? "scroll" : "static"} data-stage={stage}>
        <div className="cap__sticky">
          {/* Ambient layer: soft lighting, gradients and a faint grid, all driven by --cap-p. */}
          <div className="cap-ambient" aria-hidden="true">
            <span className="cap-ambient__glow cap-ambient__glow--violet" />
            <span className="cap-ambient__glow cap-ambient__glow--lavender" />
            <span className="cap-ambient__glow cap-ambient__glow--gold" />
            <span className="cap-ambient__grid" />
          </div>

          <div className="cap__inner">
            <header className="cap-head">
              <p className="cap-head__eyebrow">
                01 <span aria-hidden="true">/</span> {copy.services}
              </p>
              <h2 className="cap-head__title" id="services-title" data-section-heading>
                <span>{copy.servicesTitleLead}</span> <span className="cap-head__accent">{copy.servicesTitleAccent}</span>
              </h2>
              <p className="cap-head__subtitle">{copy.servicesSubtitle}</p>
            </header>

            {/* Stage timeline, filled by the same scroll progress as the preview. */}
            <div className="cap-timeline-wrap">
              <div className="cap-timeline" role="group" aria-label="Design-to-code stages">
                {capabilityStages.map((item, index) => {
                  const value = (index + 1) as CapabilityStage;
                  return (
                    <button
                      className="cap-timeline__step"
                      type="button"
                      style={{ "--i": index } as CSSProperties}
                      aria-current={value === stage ? "step" : undefined}
                      aria-label={`${scrollMode ? "Go to" : "Show"} stage ${item.number}: ${item.label}`}
                      onClick={() => goToStage(value)}
                      key={item.id}
                    >
                      <span className="cap-timeline__bar" aria-hidden="true"><span className="cap-timeline__fill" /></span>
                      <span className="cap-timeline__meta">
                        <span className="cap-timeline__number">{item.number}</span>
                        <span className="cap-timeline__label">
                          <span className="cap-timeline__label-full">{item.label}</span>
                          <span className="cap-timeline__label-short">{item.shortLabel}</span>
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {scrollMode && (
                <p className="cap-cue" aria-hidden="true">
                  <ArrowDown />
                  Scroll to build the site
                </p>
              )}
            </div>

            <div className="cap__stage">
              <figure className="cap__figure" aria-label="A concept website shown at each stage, from wireframe to launched product">
                {/* Design-tool guides around the canvas; they recede as the build becomes a product. */}
                <span className="cap-guides" aria-hidden="true">
                  <i className="cap-guides__line cap-guides__line--top" />
                  <i className="cap-guides__line cap-guides__line--bottom" />
                  <i className="cap-guides__corner cap-guides__corner--tl" />
                  <i className="cap-guides__corner cap-guides__corner--tr" />
                  <i className="cap-guides__corner cap-guides__corner--bl" />
                  <i className="cap-guides__corner cap-guides__corner--br" />
                  <span className="cap-guides__size">960 × 600</span>
                </span>
                <CapabilityPreview />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
