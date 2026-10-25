"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
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
/** Progress at which each stage begins (index 0 = stage 1). Mirrors the timeline positions below / 10. */
const STAGE_STARTS = [0, 0.17, 0.47, 0.8] as const;
/** Progress used when a stage button is pressed: the quiet "hold" inside each stage. */
const STAGE_FOCUS = [0.04, 0.4, 0.71, 0.97] as const;
const STAGE_LINK_FILL: Record<CapabilityStage, number> = { 1: 0, 2: 0.42, 3: 1, 4: 1 };

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
      const railFill = journey.querySelector<HTMLElement>("[data-cap-rail-fill]");
      const slots = gsap.utils.toArray<HTMLElement>("[data-cap-slot]", journey);
      const regions = gsap.utils.toArray<HTMLElement>("[data-cap-region]", journey);
      if (!preview || !railFill || !slots.length) return;

      // Entry: the wireframe's regions draw in while the section scrolls into place.
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

      gsap.set(preview, {
        "--cap-d": 0,
        "--cap-grid": 1,
        "--cap-wfa": 1,
        "--cap-uia": 0,
        "--cap-dev": 0,
        "--cap-ship": 0,
        "--cap-nav": 0,
        "--cap-cur": 0,
        "--cap-press": 0,
        "--cap-lift": 0,
        "--cap-cx": 940,
        "--cap-cy": 610,
      });
      gsap.set(slots, { "--cap-t": 0 });

      const syncStage = (progress: number) => {
        const next = stageFromProgress(progress);
        if (next === scrollStageRef.current) return;
        scrollStageRef.current = next;
        setScrollStage(next);
      };

      // Timeline is 10 units long; unit / 10 = scroll progress (see STAGE_STARTS / STAGE_FOCUS).
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

      timeline
        .fromTo(railFill, { scaleX: 0 }, { scaleX: 1, duration: 10 }, 0)
        // 01 → 02: placeholders are wiped into designed components, region by region.
        .to(preview, { "--cap-wfa": 0, duration: 0.6 }, 1)
        .to(preview, { "--cap-grid": 0, duration: 1.8 }, 1)
        .to(preview, { "--cap-d": 1, duration: 2, ease: "power1.inOut" }, 1.1)
        .to(slots, { "--cap-t": 1, duration: 1, ease: "power2.inOut", stagger: { amount: 1.2 } }, 1)
        .to(preview, { "--cap-uia": 1, duration: 0.5 }, 2.9)
        // 02 → 03: design annotations give way to components, states and a live cursor.
        .to(preview, { "--cap-uia": 0, duration: 0.4 }, 4.6)
        .to(preview, { "--cap-dev": 1, "--cap-nav": 1, duration: 0.6 }, 4.9)
        .to(preview, { "--cap-cur": 1, duration: 0.3 }, 5.4)
        .to(preview, { "--cap-cx": 100, "--cap-cy": 300, duration: 1, ease: "power2.inOut" }, 5.4)
        .to(preview, { "--cap-press": 1, duration: 0.22 }, 6.4)
        .to(preview, { "--cap-press": 0, duration: 0.22 }, 6.66)
        .to(preview, { "--cap-cx": 498, "--cap-cy": 474, duration: 0.8, ease: "power2.inOut" }, 6.9)
        .to(preview, { "--cap-lift": 1, duration: 0.3 }, 7.4)
        // 03 → 04: tooling disappears, the product gains depth and its responsive sibling.
        .to(preview, { "--cap-dev": 0, "--cap-cur": 0, "--cap-lift": 0, duration: 0.4 }, 8)
        .to(preview, { "--cap-ship": 1, duration: 1, ease: "power2.out" }, 8.2)
        .to({}, { duration: 0.8 }, 9.2);

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
                <div className="cap-roles" style={linkStyle}>
                  {services.map((service, index) => {
                    const active = (service.activeStages as readonly number[]).includes(stage);
                    return (
                      <article className={`cap-role${active ? " is-active" : ""}`} key={service.id}>
                        {index === 0 && <span className="cap-role__link" aria-hidden="true" />}
                        <span className="cap-role__number" aria-hidden="true">{service.number}</span>
                        <div className="cap-role__content">
                          <h3>{service.title}</h3>
                          <p className="cap-role__summary">{service.summary}</p>
                          <ul aria-label={`${service.title} skills`}>
                            {service.skills.map((skill) => (
                              <li data-focus={skill.stage === stage ? "true" : undefined} key={skill.label}>{skill.label}</li>
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
                  <span className="cap-rail__track" aria-hidden="true"><span className="cap-rail__fill" data-cap-rail-fill /></span>
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
                        <span className="cap-rail__label">{item.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
