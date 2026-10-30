"use client";

import { HeroSection } from "@/components/HeroSection";
import { ShaderCanvas } from "@/components/ui/shader-canvas";

const HERO_SHADER_COLORS = {
  u_accent: "var(--voltage-violet)",
  u_ink: "var(--midnight-ink)",
  u_surface: "var(--hero-surface)",
};

type ExperienceStoryProps = {
  introReady: boolean;
};

export function ExperienceStory({ introReady }: ExperienceStoryProps) {
  return (
    // Runway: in motion mode the hero stage stays sticky for one viewport of scroll while the next
    // section slides up over it (see .hero-runway in globals.css). Document height is unchanged.
    <div className="hero-runway" data-hero-runway>
    <section
      className="experience-story isolate box-border flex h-screen supports-[height:100svh]:h-svh w-full items-center justify-center overflow-hidden bg-[var(--surface-warm)] p-[var(--layout-hero-inset)]"
      id="experience-story"
      data-hero-stage
      aria-label="Portfolio introduction"
    >
      {/* --hero-surface: the card's light tone, a soft lavender a step darker than the page ivory so the card reads as distinct.
          The overlay below uses the same colour as rgba (no color-mix: the glass buttons' backdrop parser can't read it). */}
      <div className="relative isolate h-full min-h-0 w-full overflow-hidden rounded-[clamp(28px,4vw,54px)] border border-white/75 bg-[var(--hero-surface)] [--hero-surface:#e6dff3]" data-hero-card>
        <ShaderCanvas
          className="pointer-events-none absolute inset-0 h-full w-full"
          colors={HERO_SHADER_COLORS}
          resolution={0.62}
          stillTime={4}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[rgba(230,223,243,0.34)] via-[rgba(230,223,243,0.08)] to-[rgba(230,223,243,0.48)]"
          aria-hidden="true"
        />
        <HeroSection introReady={introReady} />
      </div>
    </section>
    </div>
  );
}
