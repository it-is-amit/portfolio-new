"use client";

import { useLayoutEffect, useRef } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { ArrowDownRight, Download, Star } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { copy, profile } from "@/data/profile";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { gsap, registerGsapPlugins } from "@/lib/gsap-client";

type HeroSectionProps = {
  introReady: boolean;
};

export function HeroSection({ introReady }: HeroSectionProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  const handleExperienceChipPointerMove = (
    event: ReactPointerEvent<HTMLDivElement>,
  ) => {
    if (reducedMotion || event.pointerType === "touch") return;
    const bounds = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty("--mx", `${event.clientX - bounds.left}px`);
    event.currentTarget.style.setProperty("--my", `${event.clientY - bounds.top}px`);
  };

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    if (!introReady || !section || !title || reducedMotion) return;
    const heroStage = section.closest<HTMLElement>("[data-hero-stage]") ?? section;

    registerGsapPlugins();
    const context = gsap.context(() => {
      const mobile = window.matchMedia("(max-width: 767px)").matches;
      const enterElements = section.querySelectorAll<HTMLElement>("[data-hero-enter]");
      const intro = gsap.timeline({ defaults: { ease: "power3.out" } });

      intro.fromTo(
        title,
        { y: mobile ? 18 : 24, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: mobile ? 0.68 : 0.82,
          clearProps: "transform,opacity,visibility",
        },
      );
      intro.fromTo(
        enterElements,
        { y: 12, autoAlpha: 0 },
        {
          y: 0,
          autoAlpha: 1,
          duration: mobile ? 0.48 : 0.56,
          stagger: mobile ? 0.055 : 0.07,
          clearProps: "transform,opacity,visibility",
        },
        "-=0.4",
      );

      const heroCard = heroStage.querySelector<HTMLElement>("[data-hero-card]");
      if (heroCard) {
        gsap.set(heroCard, {
          filter: "blur(0px)",
          transformOrigin: "50% 50%",
          willChange: "transform, filter, opacity",
        });

        gsap.timeline({
          scrollTrigger: {
            trigger: heroStage,
            start: "top top",
            end: "bottom top",
            scrub: 0.55,
            invalidateOnRefresh: true,
          },
        })
          .to(heroCard, {
            scale: mobile ? 1.04 : 1.08,
            filter: "blur(1px)",
            autoAlpha: 1,
            ease: "none",
            duration: 0.35,
          })
          .to(heroCard, {
            scale: mobile ? 1.2 : 1.3,
            filter: mobile ? "blur(10px)" : "blur(14px)",
            autoAlpha: 0,
            ease: "none",
            duration: 0.65,
          });
      }

    }, section);

    return () => context.revert();
  }, [introReady, reducedMotion]);

  return (
    <section
      className="relative z-10 h-full min-h-0 px-5 sm:px-8 lg:px-12"
      id="hero"
      ref={sectionRef}
      aria-labelledby="hero-title"
    >
      <div className="grid h-full min-h-0 place-items-center pt-[76px] pb-[76px] sm:pt-[88px] sm:pb-[88px]">
        <div className="w-full max-w-[1020px] text-center">
          <div
            className="hero-experience-chip mx-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.02em] text-[var(--midnight-ink)]"
            data-hero-enter
            onPointerMove={handleExperienceChipPointerMove}
          >
            <Star className="size-3.5 shrink-0 text-[#74490d]" fill="currentColor" strokeWidth={1.8} aria-hidden="true" />
            <span>{profile.experienceYears} years of experience</span>
          </div>
          <h1
            className="mx-auto mt-4 max-w-[1100px] text-center text-[clamp(2.5rem,6vw,6.25rem)] font-semibold leading-[0.9] tracking-[-0.085em] text-[var(--midnight-ink)] normal-case sm:mt-6"
            id="hero-title"
            ref={titleRef}
            aria-label={profile.hero.headline.join(" ")}
          >
            {profile.hero.headline[0]}{" "}
            <span className="text-[var(--ultra-violet)]">{profile.hero.headline[1]}</span>
          </h1>
          <p className="mx-auto mt-4 max-w-[720px] text-sm font-medium leading-relaxed text-[var(--graphite)] sm:mt-5 sm:text-lg" data-hero-enter>
            {profile.hero.tagline}
          </p>
          <div className="mx-auto mt-4 flex w-full max-w-[360px] flex-col justify-center gap-2 sm:mt-6 sm:w-auto sm:max-w-none sm:flex-row" data-hero-enter>
            <GlassButton
              href={profile.links.resume}
              download
              variant="primary"
              className="w-full min-h-10 sm:min-h-11 sm:w-auto"
            >
              {copy.downloadResume}<Download size={15} aria-hidden="true" />
            </GlassButton>
            <GlassButton
              href="#journey"
              variant="secondary"
              className="w-full min-h-10 sm:min-h-11 sm:w-auto"
            >
              View journey<ArrowDownRight size={16} aria-hidden="true" />
            </GlassButton>
          </div>
        </div>
      </div>
    </section>
  );
}
