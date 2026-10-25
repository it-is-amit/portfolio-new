"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { ArrowDown } from "lucide-react";
import { CapabilityPreview } from "@/components/CapabilityPreview";
import { useLenis } from "@/components/SmoothScrollProvider";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { capabilityStages, copy, profile, services, type CapabilityStage } from "@/data/profile";
import { gsap, registerGsapPlugins, revealSectionHeading, ScrollTrigger } from "@/lib/gsap-client";

/*
 * Scroll journey: the `.cap` wrapper is tall, its child is `position: sticky`, and one scrubbed
 * GSAP timeline maps the wrapper's scroll progress (0 → 1) onto CSS custom properties that the
 * preview reads. Native sticky (no GSAP pin-spacer) keeps it friendly with Lenis and the
 * neighbouring ScrollTriggers. Reduced motion or short viewports get a static, tab-driven version.
 */
const SCROLL_JOURNEY_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 600px)";
/** Timeline unit at which each stage begins (index 0 = stage 1). The timeline is 10 units long. */
const STAGE_UNITS = [0, 1.7, 4.7, 8] as const;
/** Scroll progress at which each stage begins. */
const STAGE_STARTS = STAGE_UNITS.map((unit) => unit / 10);
/** Progress used when a stage button is pressed: the settled "hold" inside each stage. */
const STAGE_FOCUS = [0.15, 0.44, 0.78, 0.97] as const;
/** Static mode only: how far the role connector is filled at each stage. */
const STAGE_LINK_FILL: Record<CapabilityStage, number> = { 1: 0, 2: 0.42, 3: 1, 4: 1 };
/** Scroll windows for each skill chip, in DOM order (both roles). */
const skillFocus = services.flatMap((service) => service.skills.map((skill) => skill.focus));

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

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const journey = journeyRef.current;
    if (!section || !journey) return;

    registerGsapPlugins();
    let refreshFrame = 0;
    const context = gsap.context(() => {
      const heading = section.querySelector<HTMLElement>("#services-title");
      if (heading && !reducedMotion) revealSectionHeading(heading);
      if (!scrollMode) return;

      const preview = journey.querySelector<HTMLElement>("[data-cap-preview]");
      const rolesWrap = journey.querySelector<HTMLElement>("[data-cap-roles]");
      const all = (selector: string) => gsap.utils.toArray<HTMLElement>(selector, journey);
      const fx = (...names: string[]) => all(names.map((name) => `[data-cap-fx="${name}"]`).join(","));
      const slots = { type: all('[data-cap-slot="type"]'), control: all('[data-cap-slot="control"]'), image: all('[data-cap-slot="image"]') };
      const builds = all("[data-cap-build]");
      const regions = all("[data-cap-region]");
      const roles = all("[data-cap-role]");
      const skills = all("[data-cap-skill]");
      if (!preview || !rolesWrap || !builds.length) return;

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
          start: "top top",
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
        .to(preview, { "--cap-c": 1, duration: 0.85, ease: "power1.inOut" }, 2.35)
        .to(slots.control, { "--cap-t": 1, duration: 0.45, ease: "power2.inOut", stagger: { amount: 0.3 } }, 2.5)
        .to(slots.image, { "--cap-t": 1, duration: 0.5, ease: "power2.inOut", stagger: { amount: 0.35 } }, 2.95)
        .to(preview, { "--cap-d": 1, duration: 0.8, ease: "power1.inOut" }, 3.55);
      show(fx("select"), 2.0);
      show(fx("tag"), 2.8);
      show(fx("redline"), 3.7);
      hide(fx("select", "tag", "redline"), 4.5, 0.25);

      // 03 · Frontend (4.7 → 8): components register one by one, then real states are exercised.
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
        .to(preview, { "--cap-ship": 1, duration: 0.8, ease: "power2.out" }, 8.25);
      timeline.to(fx("phone"), { "--cap-o": 1, duration: 0.8, ease: "power2.out" }, 8.7);

      // Left column, on the same clock: the connector fills from design into code, roles hand
      // over gradually, and each skill lights up while the preview shows it at work.
      timeline.to(rolesWrap, { "--cap-link": 1, duration: STAGE_UNITS[2] - STAGE_UNITS[1] + 0.2 }, STAGE_UNITS[1]);
      if (roles[0] && roles[1]) {
        timeline
          .to(roles[0], { "--cap-a": 0, duration: 0.4 }, 4.55)
          .to(roles[1], { "--cap-a": 1, duration: 0.4 }, 4.6)
          .to(roles[0], { "--cap-a": 1, duration: 0.45 }, 8.05);
      }
      skillFocus.forEach(([from, to], index) => {
        const skill = skills[index];
        if (!skill) return;
        timeline.to(skill, { "--cap-k": 1, duration: 0.25 }, from * 10);
        if (to < 1) timeline.to(skill, { "--cap-k": 0, duration: 0.25 }, to * 10);
      });

      timeline.to({}, { duration: 0.01 }, 9.99);

      triggerRef.current = timeline.scrollTrigger ?? null;
      syncStage(timeline.scrollTrigger?.progress ?? 0);
    }, section);

    // The journey changes page height, so neighbouring triggers need fresh measurements.
    refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.cancelAnimationFrame(refreshFrame);
      triggerRef.current = null;
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

  const linkStyle = { "--cap-link": STAGE_LINK_FILL[stage] } as CSSProperties;

  return (
    <section
      className="section-services relative overflow-x-clip bg-[var(--surface-warm)] pt-[clamp(76px,9vw,136px)] pb-[clamp(48px,6vw,96px)] text-[var(--midnight-ink)]"
      id="what-i-do"
      ref={sectionRef}
      aria-labelledby="services-title"
    >
      <div className="mx-auto max-w-[1480px] px-[clamp(20px,5vw,84px)]">
        <header className="services-section-header">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ultra-violet)]">
              01 <span className="mx-2 text-[var(--orchid-wash)]" aria-hidden="true">/</span>{copy.services}
            </p>
            <h2 className="mt-3 text-section-heading font-semibold leading-[0.88] tracking-[-0.09em] text-[var(--midnight-ink)]" id="services-title" data-section-heading>
              {copy.servicesTitle}<span className="text-[var(--voltage-violet)]">.</span>
            </h2>
          </div>
          <p className="services-section-header__intro">{profile.about.statement}</p>
        </header>

        <div className="cap" ref={journeyRef} data-mode={scrollMode ? "scroll" : "static"} data-stage={stage}>
          <div className="cap__sticky">
            <div className="cap__layout">
              <div className="cap__copy">
                <div className="cap-roles" style={scrollMode ? undefined : linkStyle} data-cap-roles>
                  {services.map((service, index) => {
                    const active = (service.activeStages as readonly number[]).includes(stage);
                    return (
                      <article className={`cap-role${active ? " is-active" : ""}`} data-cap-role key={service.id}>
                        {index === 0 && <span className="cap-role__link" aria-hidden="true" />}
                        <span className="cap-role__number" aria-hidden="true">{service.number}</span>
                        <div className="cap-role__content">
                          <h3>{service.title}</h3>
                          <p className="cap-role__summary">{service.summary}</p>
                          <ul aria-label={`${service.title} skills`}>
                            {service.skills.map((skill) => (
                              <li
                                data-cap-skill
                                data-focus={(skill.stages as readonly number[]).includes(stage) ? "true" : undefined}
                                key={skill.label}
                              >
                                {skill.label}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </article>
                    );
                  })}
                </div>

                <div className="cap-readout">
                  <p className="cap-readout__count" aria-hidden="true">
                    Stage <span>{capabilityStages[stage - 1].number}</span> / 0{capabilityStages.length}
                  </p>
                  <ol className="cap-readout__list" aria-label="From design to code">
                    {capabilityStages.map((item, index) => (
                      <li className={index + 1 === stage ? "is-active" : undefined} aria-current={index + 1 === stage ? "step" : undefined} key={item.id}>
                        <strong>{item.label}</strong>
                        <span>{item.description}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </div>

              <div className="cap__stage">
                <figure className="cap__figure" aria-label="A concept website shown at each stage, from wireframe to launched product">
                  <CapabilityPreview />
                </figure>

                <div className="cap-rail" role="group" aria-label="Design-to-code stages">
                  <span className="cap-rail__track" aria-hidden="true">
                    <span className="cap-rail__fill" />
                    <span className="cap-rail__head" />
                  </span>
                  {capabilityStages.map((item, index) => {
                    const value = (index + 1) as CapabilityStage;
                    return (
                      <button
                        className="cap-rail__step"
                        type="button"
                        aria-current={value === stage ? "step" : undefined}
                        aria-label={`${scrollMode ? "Go to" : "Show"} stage ${item.number}: ${item.label}`}
                        onClick={() => goToStage(value)}
                        key={item.id}
                      >
                        <span className="cap-rail__number">{item.number}</span>
                        <span className="cap-rail__label">
                          <span className="cap-rail__label-full">{item.label}</span>
                          <span className="cap-rail__label-short">{item.shortLabel}</span>
                        </span>
                      </button>
                    );
                  })}
                  {scrollMode && (
                    <p className="cap-cue" aria-hidden="true">
                      <ArrowDown />
                      Scroll to build the site
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
