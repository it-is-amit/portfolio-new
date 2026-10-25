"use client";

import { HeroSection } from "@/components/HeroSection";
import { ShaderCanvas } from "@/components/ui/shader-canvas";

const HERO_SHADER_COLORS = {
  u_accent: "var(--voltage-violet)",
  u_ink: "var(--midnight-ink)",
  u_surface: "var(--fog)",
};

type ExperienceStoryProps = {
  introReady: boolean;
};

export function ExperienceStory({ introReady }: ExperienceStoryProps) {
  return (
    <section
      className="experience-story relative isolate box-border flex h-screen supports-[height:100svh]:h-svh w-full items-center justify-center overflow-hidden bg-[var(--surface-warm)] p-[var(--layout-hero-inset)]"
      id="experience-story"
      data-hero-stage
      aria-label="Portfolio introduction"
    >
      <div className="relative isolate h-full min-h-0 w-full overflow-hidden rounded-[clamp(28px,4vw,54px)] border border-white/75 bg-[var(--fog)]" data-hero-card>
        <ShaderCanvas
          className="pointer-events-none absolute inset-0 h-full w-full"
          colors={HERO_SHADER_COLORS}
          resolution={0.62}
          stillTime={4}
        />
        <div
          className="pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-[rgba(241,245,249,0.34)] via-[rgba(241,245,249,0.08)] to-[rgba(241,245,249,0.48)]"
          aria-hidden="true"
        />
        <HeroSection introReady={introReady} />
      </div>
    </section>
  );
}
