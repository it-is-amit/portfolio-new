"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { profile } from "@/data/profile";
import { SocialIcon, type SocialPlatform } from "@/components/ui/social-icon";

const socialLinks: Array<{
  platform: Exclude<SocialPlatform, "instagram">;
  label: string;
  href: string;
}> = [
  { platform: "github", label: "GitHub", href: profile.links.github },
  { platform: "linkedin", label: "LinkedIn", href: profile.links.linkedin },
];

const profileInitials = profile.name.split(/\s+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

export function ProfileNotch() {
  const notchRef = useRef<HTMLElement>(null);
  const [stuck, setStuck] = useState(false);
  // The photo is only drawn once it has loaded: a failed SVG <image> paints a broken-image icon over the initials.
  const [avatarLoaded, setAvatarLoaded] = useState(false);

  useEffect(() => {
    const probe = new Image();
    probe.referrerPolicy = "no-referrer";
    probe.onload = () => setAvatarLoaded(true);
    probe.src = profile.avatar;
    return () => {
      probe.onload = null;
    };
  }, []);
  const [galleryActive, setGalleryActive] = useState(false);

  useLayoutEffect(() => {
    const notch = notchRef.current;
    const heroStage = document.querySelector<HTMLElement>("[data-hero-stage]");
    const heroCard = heroStage?.querySelector<HTMLElement>("[data-hero-card]");
    if (!notch || !heroStage || !heroCard) return;

    const gallery = document.getElementById("gallery");
    const galleryObserver = gallery && typeof IntersectionObserver !== "undefined"
      ? new IntersectionObserver(([entry]) => {
          setGalleryActive(Boolean(entry?.isIntersecting));
        }, { rootMargin: "0px 0px -98% 0px", threshold: 0 })
      : null;
    const updateGalleryVisibility = () => {
      if (!gallery) return;
      const bounds = gallery.getBoundingClientRect();
      const isVisible = bounds.bottom > 0 && bounds.top < window.innerHeight;
      setGalleryActive((current) => current === isVisible ? current : isVisible);
    };
    if (gallery && galleryObserver) galleryObserver.observe(gallery);
    else if (gallery) {
      updateGalleryVisibility();
      window.addEventListener("scroll", updateGalleryVisibility, { passive: true });
      window.addEventListener("resize", updateGalleryVisibility, { passive: true });
    }

    let naturalTop = 0;
    const measureNaturalTop = () => {
      // The stage is sticky inside its runway, so measure the runway's (static) position.
      const stage = (heroStage.closest<HTMLElement>("[data-hero-runway]") ?? heroStage).getBoundingClientRect();
      const stagePadding = Number.parseFloat(getComputedStyle(heroStage).paddingTop) || 0;
      const cardBorder = Number.parseFloat(getComputedStyle(heroCard).borderTopWidth) || 0;
      naturalTop = stage.top + window.scrollY + stagePadding + cardBorder;
    };
    const updateStickyState = () => {
      const nextStuck = window.scrollY >= naturalTop;
      setStuck((current) => current === nextStuck ? current : nextStuck);
    };
    const onResize = () => {
      measureNaturalTop();
      updateStickyState();
    };

    measureNaturalTop();
    updateStickyState();
    window.addEventListener("scroll", updateStickyState, { passive: true });
    window.addEventListener("resize", onResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", updateStickyState);
      window.removeEventListener("resize", onResize);
      galleryObserver?.disconnect();
      if (gallery && !galleryObserver) {
        window.removeEventListener("scroll", updateGalleryVisibility);
        window.removeEventListener("resize", updateGalleryVisibility);
      }
    };
  }, []);

  return (
    <header
      className="profile-notch pointer-events-none inset-x-0 z-[160] flex justify-center"
      data-stuck={stuck ? "true" : undefined}
      data-gallery-active={galleryActive ? "true" : undefined}
      aria-hidden={galleryActive}
      inert={galleryActive}
      ref={notchRef}
    >
      <div
        className={`pointer-events-auto flex h-[52px] w-[min(280px,calc(100vw_-_16px))] items-center justify-between rounded-b-[26px] border-x border-b border-white/80 bg-[var(--surface-warm)] px-3 backdrop-blur-xl ${stuck ? "shadow-[0_8px_20px_rgba(17,24,39,0.08)]" : "shadow-none"}`}
        role="group"
        aria-label="Profile and social links"
      >
        <a
          className="flex min-w-0 items-center gap-2"
          href="#hero"
        >
          {/* An SVG <image>, not <img>: glass buttons scrolling under the notch repaint the HTML below them into
              WebGL, and a cross-origin <img> without CORS would taint that canvas. The glass never walks into <svg>. */}
          <svg className="size-8 shrink-0 overflow-hidden rounded-full border border-white/80 bg-[var(--lavender-field)]" viewBox="0 0 32 32" aria-hidden="true">
            {/* Initials underneath: the photo covers them once loaded, and they remain if the photo URL stops working. */}
            <text x="16" y="16.5" textAnchor="middle" dominantBaseline="middle" className="fill-[var(--ultra-violet)] text-[12px] font-bold tracking-[-0.04em]">
              {profileInitials}
            </text>
            {avatarLoaded ? <image href={profile.avatar} width="32" height="32" preserveAspectRatio="xMidYMid slice" /> : null}
          </svg>
          <span className="flex min-w-0 flex-col items-start gap-0.5">
            <strong className="text-[13px] font-bold leading-none tracking-[-0.025em] text-[var(--ultra-violet)] sm:text-[14px]">
              {profile.name}
            </strong>
            <span className="text-[9px] font-medium leading-none text-[var(--graphite)]">
              {profile.hero.roleLabel}
            </span>
          </span>
        </a>

        <span className="mx-1 h-6 w-px shrink-0 bg-[rgba(95,37,158,0.16)]" aria-hidden="true" />

        <nav className="flex shrink-0 items-center gap-0.5" aria-label="Social links">
          {socialLinks.map(({ platform, label, href }) => (
            <a
              className="grid size-8 shrink-0 place-items-center rounded-full text-[var(--graphite)] transition-colors duration-200 hover:bg-[var(--lavender-field)] hover:text-[var(--ultra-violet)] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--voltage-violet)] motion-reduce:transition-none"
              href={href}
              key={platform}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} profile (opens in a new tab)`}
              title={label}
            >
              <SocialIcon platform={platform} className="size-4 text-[var(--ultra-violet)]" />
            </a>
          ))}
        </nav>
      </div>
    </header>
  );
}
