"use client";

import { useLayoutEffect, useRef } from "react";
import { ArrowUpRight } from "lucide-react";
import { GlassButton } from "@/components/ui/glass-button";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { copy, profile } from "@/data/profile";
import { gsap, registerGsapPlugins, revealSectionHeading } from "@/lib/gsap-client";

export function ContactSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || reducedMotion) return;

    registerGsapPlugins();
    const context = gsap.context(() => {
      const heading = section.querySelector<HTMLElement>("#contact-title");
      if (heading) revealSectionHeading(heading);

      const details = section.querySelectorAll<HTMLElement>("[data-contact-reveal]:not(#contact-title)");
      if (details.length) {
        gsap.fromTo(
          details,
          { y: 18, autoAlpha: 0, filter: "blur(8px)" },
          {
            y: 0,
            autoAlpha: 1,
            filter: "blur(0px)",
            duration: 0.68,
            stagger: 0.06,
            ease: "power3.out",
            scrollTrigger: { trigger: section, start: "top 76%", once: true },
          },
        );
      }
    }, section);

    return () => context.revert();
  }, [reducedMotion]);

  return (
    <section className="section-contact relative isolate overflow-hidden py-[clamp(80px,10vw,148px)]" id="contact" ref={sectionRef} aria-labelledby="contact-title">
      <span className="pointer-events-none absolute -right-[0.08em] top-[0.12em] select-none text-[clamp(16rem,36vw,42rem)] font-semibold leading-[0.72] tracking-[-0.12em] text-[rgba(95,37,158,0.045)]" aria-hidden="true">05</span>
      <div className="relative mx-auto flex w-full max-w-[1480px] flex-col items-center gap-8 px-[clamp(20px,5vw,84px)] text-center">
        <div className="flex w-full min-w-0 flex-col items-center">
          <h2 className="mx-auto mt-0 max-w-[1050px] text-center text-section-heading font-semibold leading-[0.88] tracking-[-0.09em] text-[var(--midnight-ink)]" id="contact-title" data-section-heading>
            <span className="block text-[0.8em]">Open to</span>
            <span className="block text-[var(--ultra-violet)]">Senior Frontend</span>
            <span className="block text-[0.8em]">roles</span>
          </h2>
          <p className="mx-auto mt-5 max-w-[610px] text-center text-sm leading-relaxed text-[var(--graphite)] sm:text-base" data-contact-reveal>
            React / Next.js roles at product companies, in India and remote.
          </p>

          <a
            className="group mx-auto mt-7 flex w-fit max-w-full items-center justify-center gap-3 border-b border-[rgba(17,24,39,0.28)] pb-2 text-[clamp(1rem,3vw,2rem)] font-medium tracking-[-0.045em] text-[var(--midnight-ink)] transition-[border-color,color] duration-200 hover:border-[var(--ultra-violet)] hover:text-[var(--ultra-violet)] active:text-[var(--voltage-violet)] motion-reduce:transition-none sm:mt-9"
            href={`mailto:${profile.email}`}
            data-contact-reveal
          >
            <span className="break-all">{profile.email}</span>
            <ArrowUpRight className="shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" size={23} aria-hidden="true" />
          </a>

          <div className="mt-7 flex flex-wrap justify-center gap-x-7 gap-y-3 font-mono text-[9px] uppercase tracking-[0.08em]" data-contact-reveal>
            <GlassButton
              className="group"
              href={profile.links.resume}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${copy.downloadResume} (PDF, opens in a new tab)`}
              size="compact"
              variant="secondary"
            >
              {copy.downloadResume}<ArrowUpRight className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none" size={13} aria-hidden="true" />
            </GlassButton>
          </div>
        </div>
      </div>
    </section>
  );
}
