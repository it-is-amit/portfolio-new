"use client";

import { useLayoutEffect, useRef } from "react";
import { ArrowDownRight, Download, Star } from "lucide-react";
import { AwardBadge } from "@/components/ui/award-badge";
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

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const title = titleRef.current;
    if (!introReady || !section || !title || reducedMotion) return;
    const heroStage = section.closest<HTMLElement>("[data-hero-stage]") ?? section;

    registerGsapPlugins();
    let shaderCanvas: HTMLCanvasElement | null = null;
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

      // Exit: while the stage is sticky, the card shrinks, drifts up slightly, blurs and fades,
      // scrubbed by scroll (with light smoothing) so it finishes as the next section reaches the
      // top. The fade completes a little before the end, so the incoming section's soft edge only
      // ever overlaps a faint, softened card. The WebGL background is frozen while the card is
      // blurred: a live shader under a CSS blur is the most expensive thing on the page.
      const heroCard = heroStage.querySelector<HTMLElement>("[data-hero-card]");
      const runway = heroStage.closest<HTMLElement>("[data-hero-runway]") ?? heroStage;
      if (heroCard) {
        const shader = heroCard.querySelector<HTMLCanvasElement>("canvas");
        gsap.set(heroCard, { transformOrigin: "50% 50%", willChange: "transform, filter, opacity" });
        gsap.timeline({
          defaults: { ease: "none" },
          scrollTrigger: {
            trigger: runway,
            start: "top top",
            end: () => `+=${heroStage.offsetHeight}`,
            scrub: 0.5,
            invalidateOnRefresh: true,
            onUpdate: (self) => {
              if (!shader) return;
              const paused = self.progress > 0.04;
              if ((shader.dataset.paused === "true") !== paused) shader.dataset.paused = String(paused);
            },
          },
        })
          .fromTo(heroCard, { scale: 1, yPercent: 0 }, { scale: mobile ? 0.86 : 0.8, yPercent: mobile ? -4 : -7, duration: 1, ease: "power1.out" }, 0)
          .fromTo(heroCard, { filter: "blur(0px)" }, { filter: mobile ? "blur(8px)" : "blur(10px)", duration: 0.8, ease: "power1.in" }, 0)
          .fromTo(heroCard, { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.62, ease: "power1.in" }, 0.08);
        shaderCanvas = shader;
      }

    }, section);

    return () => {
      context.revert();
      if (shaderCanvas) delete shaderCanvas.dataset.paused;
    };
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
          {/* Same metallic plate as the Journey award cards (gold tone), with tilt scaled for a chip. */}
          <AwardBadge
            as="div"
            tone="gold"
            tilt={0.55}
            className="hero-experience-chip mx-auto inline-flex min-h-10 items-center justify-center gap-2 rounded-full px-4 py-2 text-[12px] font-semibold tracking-[0.02em] text-[var(--midnight-ink)]"
            data-hero-enter
          >
            <Star className="size-3.5 shrink-0 text-[#74490d]" fill="currentColor" strokeWidth={1.8} aria-hidden="true" />
            <span>{profile.experienceYears} years of experience</span>
          </AwardBadge>
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
