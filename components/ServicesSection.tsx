"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { CapabilityPreview } from "@/components/CapabilityPreview";
import { useLenis } from "@/components/SmoothScrollProvider";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { capabilityStages, copy, type CapabilityStage } from "@/data/profile";
import { gsap, registerGsapPlugins, revealSectionHeading, ScrollTrigger } from "@/lib/gsap-client";

/*
 * Showcase: one centred composition (heading, subtitle, stage timeline, large dashboard preview)
 * inside a tall `.cap` wrapper whose child is `position: sticky`. It slides up over the exiting
 * hero (behind a soft, scroll-shortened top edge), pins, and one scrubbed GSAP timeline maps the
 * wrapper's scroll progress (0 → 1) onto CSS custom properties read by the preview and by the
 * section background, which moves through four colour states and ends on the next section's. Native sticky (no GSAP
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
      const slots = { type: all('[data-cap-slot="type"]'), control: all('[data-cap-slot="control"]'), visual: all('[data-cap-slot="visual"]') };
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
      // sticky element itself, so native sticky is untouched), and the background's soft top edge
      // (--cap-arrive, see .cap-bg) shortens from a long fade to nothing. Light scrub smoothing
      // keeps the hand-off fluid without lagging behind the hero's exit.
      const arrival = { trigger: journey, start: "top bottom", end: "top top", scrub: 0.4, invalidateOnRefresh: true };
      gsap.fromTo(
        figure,
        { y: () => window.innerHeight * 0.12, scale: 0.94 },
        { y: 0, scale: 1, ease: "none", scrollTrigger: arrival },
      );
      gsap.fromTo(journey, { "--cap-arrive": 0 }, { "--cap-arrive": 1, ease: "power1.out", scrollTrigger: { ...arrival } });

      // Entry: the dashboard regions (sidebar, top bar, cards, table) draw in while the
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
        .to(journey, { "--cap-p": 1, duration: 10 - STAGE_UNITS[3] }, STAGE_UNITS[3]);

      // Section colour journey: each stage change crossfades the whole background behind the
      // preview (ivory → lavender wash → deep violet → the Tools & Tech night gradient).
      timeline
        .to(journey, { "--cap-k2": 1, duration: 1.1, ease: "power1.inOut" }, STAGE_UNITS[1] - 0.05)
        .to(journey, { "--cap-k3": 1, duration: 0.9, ease: "power1.inOut" }, STAGE_UNITS[2] - 0.1)
        .to(journey, { "--cap-k4": 1, duration: 1.1, ease: "power1.inOut" }, STAGE_UNITS[3] - 0.05);

      // 01 · Wireframe (0 → 1.7): the dashboard's structure is placed piece by piece.
      const build = (group: string, at: number, stagger = 0) =>
        timeline.to(all(`[data-cap-build="${group}"]`), { "--cap-b": 1, duration: 0.3, ease: "power2.out", stagger }, at);
      build("side", 0.05, 0.06);
      build("top", 0.28, 0.05);
      build("kpi", 0.42, 0.07);
      build("chart", 0.7);
      build("sources", 0.82);
      build("table", 0.92, 0.05);
      show(fx("flow"), 1.15, 0.3);

      // 02 · UI design (1.7 → 4.7): type, then colour, then controls and charts, then refinement.
      hide(fx("label", "flow"), 1.7, 0.3);
      timeline
        .to(preview, { "--cap-grid": 0, duration: 1.4 }, 1.75)
        .to(slots.type, { "--cap-t": 1, duration: 0.45, ease: "power2.inOut", stagger: { amount: 0.75 } }, 1.7)
        .to(preview, { "--cap-c": 1, duration: 0.85, ease: "power1.inOut" }, 2.35)
        .to(slots.control, { "--cap-t": 1, duration: 0.45, ease: "power2.inOut", stagger: { amount: 0.3 } }, 2.5)
        .to(slots.visual, { "--cap-t": 1, duration: 0.5, ease: "power2.inOut", stagger: { amount: 0.35 } }, 2.95)
        .to(preview, { "--cap-line": 1, duration: 0.7, ease: "power1.inOut" }, 3.15)
        .to(preview, { "--cap-d": 1, duration: 0.8, ease: "power1.inOut" }, 3.55);
      show(fx("select"), 2.0);
      show(fx("tag"), 2.8);
      show(fx("redline"), 3.7);
      hide(fx("select", "tag", "redline"), 4.5, 0.25);

      // 03 · Frontend (4.7 → 8): components register, the UI is wired to data (skeleton, then
      // values count up and the chart redraws), and a cursor exercises real states.
      show(fx("outline-side"), 4.8, 0.25);
      show(fx("code"), 4.9, 0.35);
      show(fx("outline-kpi"), 4.95, 0.25);
      timeline
        .to(preview, { "--cap-load": 1, duration: 0.25 }, 4.95)
        .to(preview, { "--cap-live": 1, duration: 0.05 }, 5.2)
        .to(preview, { "--cap-load": 0, duration: 0.25 }, 5.3)
        .to(preview, { "--cap-n": 1, duration: 0.9, ease: "power1.out" }, 5.3);
      show(fx("outline-chart"), 5.2, 0.25);
      show(fx("outline-table"), 5.45, 0.25);
      show(fx("toast"), 5.6, 0.25);
      timeline
        .to(preview, { "--cap-cur": 1, duration: 0.2 }, 5.75)
        .to(preview, { "--cap-cx": 70, "--cap-cy": 118, duration: 0.45, ease: "power2.inOut" }, 5.75)
        .to(preview, { "--cap-hn": 1, duration: 0.15 }, 6.15)
        .to(preview, { "--cap-cx": 646, "--cap-cy": 214, duration: 0.55, ease: "power2.inOut" }, 6.4)
        .to(preview, { "--cap-hn": 0, duration: 0.15 }, 6.45)
        .to(preview, { "--cap-press": 1, duration: 0.15 }, 6.95)
        .to(preview, { "--cap-range": 1, duration: 0.6, ease: "power1.inOut" }, 7.0)
        .to(preview, { "--cap-press": 0, duration: 0.15 }, 7.12)
        .to(preview, { "--cap-cx": 520, "--cap-cy": 530, duration: 0.45, ease: "power2.inOut" }, 7.35)
        .to(preview, { "--cap-lift": 1, duration: 0.2 }, 7.72);

      // 04 · Final product (8 → 10): tooling steps away, depth and the responsive view arrive.
      hide(fx("toast"), 7.9, 0.2);
      hide(fx("code"), 7.95, 0.3);
      hide(fx("outline-table", "outline-chart", "outline-kpi", "outline-side"), 8.0, 0.25, 0.06);
      timeline
        .to(preview, { "--cap-cur": 0, "--cap-lift": 0, duration: 0.3 }, 8.0)
        .to(preview, { "--cap-ship": 1, duration: 0.8, ease: "power2.out" }, 8.25);
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
      className="section-services relative overflow-x-clip text-[var(--midnight-ink)]"
      id="what-i-do"
      ref={sectionRef}
      aria-labelledby="services-title"
    >
      <div
        className="cap"
        ref={journeyRef}
        data-mode={scrollMode ? "scroll" : "static"}
        data-stage={stage}
        // Stages 03–04 sit on a dark background; the section dock reads this to switch its glass tone.
        data-tone={scrollMode && stage >= 3 ? "dark" : undefined}
      >
        <div className="cap__sticky">
          {/* Section background: the four-state colour journey, soft light and a faint grid. */}
          <div className="cap-bg" aria-hidden="true">
            <span className="cap-bg__night" />
            <span className="cap-ambient__glow cap-ambient__glow--violet" />
            <span className="cap-ambient__glow cap-ambient__glow--lavender" />
            <span className="cap-ambient__glow cap-ambient__glow--gold" />
            <span className="cap-ambient__grid" />
          </div>

          <div className="cap__inner">
            <header className="cap-head">
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
            </div>

            <div className="cap__stage">
              <figure className="cap__figure" aria-label="A concept analytics dashboard shown at each stage: wireframe, UI design, frontend build with live data, and the shipped product">
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
