"use client";

import { useLayoutEffect, useRef } from "react";
import { Award, GraduationCap, Star } from "lucide-react";
import { awards, copy, education, journey } from "@/data/profile";
import { AwardBadge } from "@/components/ui/award-badge";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { gsap, registerGsapPlugins, revealSectionHeading } from "@/lib/gsap-client";

const CARD_STACK_STEP = 16;

export function JourneySection() {
  const sectionRef = useRef<HTMLElement>(null);
  const stackRef = useRef<HTMLDivElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const stack = stackRef.current;
    if (!section || !stack) return;

    registerGsapPlugins();
    const context = gsap.context(() => {
      const heading = section.querySelector<HTMLElement>("[data-journey-heading]");
      if (heading && !reducedMotion) revealSectionHeading(heading);

      const media = gsap.matchMedia();
      media.add("(min-width: 768px) and (prefers-reduced-motion: no-preference)", () => {
        const cards = Array.from(stack.querySelectorAll<HTMLElement>("[data-journey-card]"));
        if (cards.length < 2) return;

        const stickyTop = (index: number) =>
          Math.round(Math.min(108, Math.max(78, window.innerHeight * 0.1)) + index * CARD_STACK_STEP);

        cards.forEach((card, index) => {
          const deckTransition = gsap.timeline({
            scrollTrigger: {
              trigger: card,
              start: "top 82%",
              end: () => `top ${stickyTop(index)}px`,
              scrub: 0.45,
              invalidateOnRefresh: true,
            },
          });

          deckTransition.fromTo(
            card,
            { y: 24, scale: 0.985, immediateRender: false, transformOrigin: "center top", force3D: true },
            { y: 0, scale: 1, duration: 1, ease: "none" },
            0,
          );

          for (let previous = 0; previous < index; previous += 1) {
            const distanceBefore = index - 1 - previous;
            const distanceAfter = index - previous;
            deckTransition.fromTo(
              cards[previous],
              {
                y: -distanceBefore * 4,
                scale: 1 - distanceBefore * 0.012,
                immediateRender: false,
                transformOrigin: "center top",
                force3D: true,
              },
              {
                y: -distanceAfter * 4,
                scale: 1 - distanceAfter * 0.012,
                duration: 1,
                ease: "none",
              },
              0,
            );
          }
        });
      });

      return () => media.revert();
    }, section);

    return () => context.revert();
  }, [reducedMotion]);

  return (
    <section className="journey-section" id="journey" ref={sectionRef} aria-labelledby="journey-title">
      <div className="journey-section__layout">
        <aside className="journey-side">
          <div className="section-marker" aria-hidden="true">
            <span className="section-marker__number">03</span>
            <span>{copy.journey}</span>
          </div>
          <div className="journey-side__sticky">
            <div className="journey-side__heading">
              <p className="eyebrow">{copy.journeyCaption}</p>
              <h2
                className="mt-2.5 mb-4 text-section-heading font-semibold leading-[0.88] tracking-[-0.09em] text-[var(--midnight-ink)]"
                id="journey-title"
                data-journey-heading
              >
                {copy.journeyTitle}
              </h2>
              <p>{copy.journeyIntro}</p>
            </div>
          </div>
        </aside>

        <div className="journey-main flex min-w-0 flex-col gap-7">
          <div
            className="journey-card-stack"
            data-journey-card-stack
            ref={stackRef}
            role="list"
            aria-label={copy.journey}
          >
            {journey.map((item, index) => (
              <article
                className="journey-card"
                data-journey-card
                data-stack-index={index}
                key={item.id}
                role="listitem"
                aria-labelledby={`journey-${item.id}`}
              >
                <span className="journey-card__connector" aria-hidden="true" />
                <div className="journey-card__topline">
                  <span className="journey-card__index">0{index + 1}</span>
                  <span className="journey-card__period">{item.period}</span>
                </div>
                <div className="journey-card__details">
                  <h3 id={`journey-${item.id}`}>{item.role}</h3>
                  <p className="journey-card__company">{item.company}</p>
                  <p className="journey-card__description">{item.description}</p>
                </div>
              </article>
            ))}
          </div>

          <aside className="journey-credentials" aria-label="Education and recognition">
            <section className="journey-education-card" aria-labelledby="education-title">
              <div className="journey-education-card__topline">
                <span>{copy.journeyEducation}</span>
                <span className="journey-education-card__icon">
                  <GraduationCap size={19} strokeWidth={1.8} aria-hidden="true" />
                </span>
              </div>
              <p className="journey-education-card__degree-label" aria-hidden="true">B.Tech</p>
              <h3 id="education-title">
                <span className="sr-only">B.Tech in </span>
                {education.qualification.replace(/^B\.Tech in /, "")}
              </h3>
              <p className="journey-education-card__institution">{education.institution}</p>
              <span className="journey-education-card__dates">
                {education.dates.replace(" to ", "–")}
              </span>
            </section>

            <div className="journey-awards-grid" role="list" aria-label={copy.recognition}>
              {awards.map((award, index) => {
                const AwardIcon = index === 0 ? Award : Star;
                return (
                  <AwardBadge
                    className="journey-award-card"
                    tone={index === 0 ? "gold" : "violet"}
                    key={award.title}
                    role="listitem"
                    aria-labelledby={`journey-award-${index}`}
                  >
                    <span className="journey-award-card__icon">
                      <AwardIcon size={20} strokeWidth={1.7} aria-hidden="true" />
                    </span>
                    <div className="journey-award-card__copy">
                      <p className="journey-award-card__eyebrow">{copy.recognition}</p>
                      <h3 id={`journey-award-${index}`}>{award.title}</h3>
                      <p className="journey-award-card__organization">{award.organization}</p>
                    </div>
                    <span className="journey-award-card__index" aria-hidden="true">0{index + 1}</span>
                  </AwardBadge>
                );
              })}
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
