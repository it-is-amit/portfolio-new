"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { ArrowUpRight, Mail, Phone } from "lucide-react";
import { MotionConfig, motion } from "motion/react";
import { ContactSection } from "@/components/ContactSection";
import { ExperienceStory } from "@/components/ExperienceStory";
import { JourneySection } from "@/components/JourneySection";
import UnfurlingGallery from "@/components/ui/3d-parallax-unfurling-gallery";
import { Preloader } from "@/components/Preloader";
import { ProfileNotch } from "@/components/ProfileNotch";
import { SectionDock } from "@/components/SectionDock";
import { ServicesSection } from "@/components/ServicesSection";
import { SocialIcon, type SocialPlatform } from "@/components/ui/social-icon";
import { SmoothScrollProvider } from "@/components/SmoothScrollProvider";
import { StackSection } from "@/components/StackSection";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { copy, profile } from "@/data/profile";
import { gsap, registerGsapPlugins, revealSectionHeading } from "@/lib/gsap-client";

const footerSocials: Array<{ id: SocialPlatform; label: string; href: string | null }> = [
  { id: "instagram", label: "Instagram", href: profile.links.instagram },
  { id: "linkedin", label: "LinkedIn", href: profile.links.linkedin },
  { id: "github", label: "GitHub", href: profile.links.github },
];

const socialAccents: Record<SocialPlatform, string> = {
  instagram: "#D62976",
  linkedin: "#0A66C2",
  github: "#F0F6FC",
};

const socialSpring = { type: "spring" as const, stiffness: 440, damping: 18, mass: 0.72 };

type FooterSocialLinkProps = (typeof footerSocials)[number] & { reducedMotion: boolean };

function FooterSocialLink({ id, label, href, reducedMotion }: FooterSocialLinkProps) {
  const icon = <span className="relative z-[1] grid place-items-center"><SocialIcon platform={id} /></span>;
  const style = { "--social-accent": socialAccents[id] } as CSSProperties;
  const className = "footer-social group relative grid size-12 place-items-center rounded-full border border-white/30 bg-white/10 shadow-[inset_0_1px_0_rgba(255,255,255,0.28),0_12px_28px_rgba(0,0,0,0.18)] backdrop-blur-xl backdrop-saturate-150 transition-[transform,border-color,background-color,box-shadow] duration-300 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--lavender-mist)]";
  const hover = reducedMotion ? undefined : { y: -5, scale: 1.09, rotate: id === "linkedin" ? -5 : 5 };
  const tap = reducedMotion ? undefined : { scale: 0.94 };

  if (!href) {
    return (
      <motion.span
        className={`${className} cursor-default`}
        style={style}
        role="img"
        aria-label={`${label} icon; profile URL not provided`}
        title={`${label} profile URL not provided`}
        whileHover={hover}
        transition={socialSpring}
      >
        {icon}
      </motion.span>
    );
  }

  return (
    <motion.a
      className={className}
      style={style}
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={`${label} profile (opens in a new tab)`}
      title={label}
      whileHover={hover}
      whileTap={tap}
      transition={socialSpring}
    >
      {icon}
    </motion.a>
  );
}

export function HomeExperience() {
  const [introReady, setIntroReady] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const footerRef = useRef<HTMLElement>(null);
  const handleIntroComplete = useCallback(() => setIntroReady(true), []);

  useLayoutEffect(() => {
    const footer = footerRef.current;
    const heading = footer?.querySelector<HTMLElement>("[data-footer-heading]");
    if (!footer || !heading || reducedMotion) return;

    registerGsapPlugins();
    const context = gsap.context(() => {
      revealSectionHeading(heading);
    }, footer);

    return () => context.revert();
  }, [reducedMotion]);

  return (
    <SmoothScrollProvider>
      <MotionConfig reducedMotion="user">
        <div className="portfolio-shell">
          <a className="skip-link" href="#main-content">{copy.skipToContent}</a>
          <ProfileNotch />
          <Preloader onComplete={handleIntroComplete} />
          <main id="main-content" className="portfolio-main">
            <ExperienceStory introReady={introReady} />
            <ServicesSection />
            <StackSection />
            <JourneySection />
            <UnfurlingGallery />
            <ContactSection />
            <footer className="site-footer relative isolate flex flex-col overflow-hidden text-[var(--pure-white)]" id="site-footer" ref={footerRef}>
              <span className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[rgba(255,255,255,0.34)] to-transparent" aria-hidden="true" />
              <span className="site-footer__glow pointer-events-none absolute -right-28 top-8 size-[min(48vw,640px)] rounded-full" aria-hidden="true" />
              <div className="site-footer__inner relative z-10 mx-auto flex w-full max-w-[1480px] flex-1 flex-col px-[clamp(20px,5vw,84px)] py-[clamp(28px,4.5vw,58px)] pb-[var(--layout-dock-clearance)]">
                <div className="flex items-center justify-between gap-4">
                  <p className="m-0 text-sm font-medium text-[rgba(241,245,249,0.72)]">Thank you for being here.</p>
                  <a className="inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[var(--pure-white)] transition-colors hover:text-[var(--lavender-mist)] motion-reduce:transition-none" href="#hero">
                    {copy.backToTop}<ArrowUpRight size={15} aria-hidden="true" />
                  </a>
                </div>

                <div className="grid flex-1 grid-cols-1 content-center gap-12 py-[clamp(48px,8vh,96px)] lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] lg:items-center lg:gap-16">
                  <div className="max-w-[820px]">
                    <h2 className="whitespace-nowrap text-[clamp(3.1rem,9.7vw,8.5rem)] font-semibold leading-[0.82] tracking-[-0.095em] text-[var(--pure-white)]" data-footer-heading>
                      {profile.name}<span className="text-[var(--lavender-mist)]">.</span>
                    </h2>
                    <p className="mt-6 text-lg font-semibold tracking-[-0.035em] text-[var(--lavender-mist)] sm:text-2xl">
                      {profile.hero.roleLabel}
                    </p>
                    <p className="mt-4 max-w-[590px] text-sm leading-relaxed text-[rgba(241,245,249,0.72)] sm:text-base">
                      Thoughtful digital products, brought to life with React, Next.js, and care for every interaction.
                    </p>
                  </div>

                  <div className="site-footer__contact max-w-[520px]">
                    <p className="text-sm font-medium text-[rgba(241,245,249,0.68)]">Have a product or idea in mind?</p>
                    <p className="mt-1 text-xl font-semibold tracking-[-0.04em] text-[var(--pure-white)] sm:text-2xl">Let’s start a conversation.</p>
                    <div className="mt-6 grid gap-3">
                      <a className="site-footer__action group" href={`mailto:${profile.email}`}>
                        <span className="site-footer__action-icon"><Mail size={19} aria-hidden="true" /></span>
                        <span className="site-footer__action-copy">
                          <span>Email</span>
                          <strong>{profile.email}</strong>
                        </span>
                        <ArrowUpRight className="site-footer__action-arrow" size={18} aria-hidden="true" />
                      </a>
                      <a className="site-footer__action group" href={profile.links.phone}>
                        <span className="site-footer__action-icon"><Phone size={19} aria-hidden="true" /></span>
                        <span className="site-footer__action-copy">
                          <span>Call</span>
                          <strong>{profile.phone}</strong>
                        </span>
                        <ArrowUpRight className="site-footer__action-arrow" size={18} aria-hidden="true" />
                      </a>
                    </div>
                    <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
                      <p className="m-0 text-sm font-semibold text-[rgba(241,245,249,0.78)]">Connect with me</p>
                      <nav className="flex items-center gap-3" aria-label="Social profiles">
                        {footerSocials.map((social) => <FooterSocialLink {...social} reducedMotion={reducedMotion} key={social.id} />)}
                      </nav>
                    </div>
                  </div>
                </div>

                <div className="site-footer__bottom">
                  <span>{profile.location}</span>
                  <small>{profile.copyright}</small>
                </div>
              </div>
            </footer>
          </main>
          <SectionDock />
        </div>
      </MotionConfig>
    </SmoothScrollProvider>
  );
}
