"use client";

import { useLayoutEffect, useRef } from "react";
import { gsap, registerGsapPlugins } from "@/lib/gsap-client";
import { PRELOADER_ATTRIBUTE } from "@/lib/preloader-boot";
import { copy, profile } from "@/data/profile";

type PreloaderProps = {
  /** Called once, as the curtain starts to lift, so the hero intro plays while it is being revealed. */
  onReveal: () => void;
};

/** Longest the loader waits for fonts and the page `load` event before it finishes anyway. */
const READY_CAP_MS = 2400;
const SCROLL_KEYS = new Set([" ", "PageDown", "PageUp", "ArrowDown", "ArrowUp", "Home", "End"]);

function whenPageReady() {
  const fonts = document.fonts?.ready ?? Promise.resolve();
  const load = document.readyState === "complete"
    ? Promise.resolve()
    : new Promise<void>((resolve) => window.addEventListener("load", () => resolve(), { once: true }));
  const cap = new Promise<void>((resolve) => window.setTimeout(resolve, READY_CAP_MS));
  return Promise.race([Promise.all([fonts, load]).then(() => undefined), cap]);
}

/**
 * Intro loader. It is visible from the first paint: `lib/preloader-boot.ts` (inline in <head>) switches it on and
 * runs the counter until this component hydrates and takes over. It plays on every load, counts up with the real
 * loading state (fonts + page load, capped), then lifts away with a curved edge while the hero animates in.
 */
export function Preloader({ onReveal }: PreloaderProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const revealedRef = useRef(false);

  useLayoutEffect(() => {
    const html = document.documentElement;
    const reveal = () => {
      if (revealedRef.current) return;
      revealedRef.current = true;
      onReveal();
    };

    const root = rootRef.current;
    const boot = window.__preloader;
    // Not running: reduced motion, the boot failsafe already removed it, or the loader already finished.
    if (!root || !boot || html.getAttribute(PRELOADER_ATTRIBUTE) !== "run") {
      reveal();
      return;
    }

    registerGsapPlugins();
    boot.handedOff = true;
    window.cancelAnimationFrame(boot.frame);

    // The page stays put underneath while the loader is up (capture phase, so Lenis never sees the input).
    const block = (event: Event) => {
      if (event instanceof KeyboardEvent && !SCROLL_KEYS.has(event.key)) return;
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    const blockOptions = { capture: true, passive: false } as const;
    const unblock = () => {
      window.removeEventListener("wheel", block, blockOptions);
      window.removeEventListener("touchmove", block, blockOptions);
      window.removeEventListener("keydown", block, blockOptions);
    };
    window.addEventListener("wheel", block, blockOptions);
    window.addEventListener("touchmove", block, blockOptions);
    window.addEventListener("keydown", block, blockOptions);

    const count = root.querySelector<HTMLElement>("[data-preloader-count]");
    const bar = root.querySelector<HTMLElement>("[data-preloader-bar]");
    const progress = { value: boot.value };
    const render = () => {
      boot.value = progress.value;
      if (count) count.textContent = `${Math.round(progress.value)}`.padStart(3, "0");
      if (bar) bar.style.transform = `scaleX(${progress.value / 100})`;
    };

    let cancelled = false;
    const context = gsap.context(() => {
      // Count up briskly, then creep while waiting for the page, so it never looks stuck.
      const intro = gsap.timeline()
        .to(progress, { value: 92, duration: 0.62, ease: "power1.out", onUpdate: render })
        .to(progress, { value: 98, duration: 2.4, ease: "power1.out", onUpdate: render });

      void Promise.all([whenPageReady(), new Promise((resolve) => intro.call(resolve, [], 0.62))]).then(() => context.add(() => {
        if (cancelled) return;
        intro.kill();
        // An in-page link (#contact) keeps its target; otherwise every load starts at the top.
        if (!window.location.hash && window.scrollY > 0) window.scrollTo(0, 0);

        const lift = 0.2;
        gsap.timeline({
          defaults: { ease: "power3.in" },
          onComplete: () => {
            unblock();
            html.removeAttribute(PRELOADER_ATTRIBUTE);
          },
        })
          .to(progress, { value: 100, duration: 0.26, ease: "power2.out", onUpdate: render })
          .addLabel("exit")
          .to("[data-preloader-digits]", { yPercent: -108, duration: 0.5 }, "exit")
          .to("[data-preloader-fade]", { y: -14, autoAlpha: 0, duration: 0.36, stagger: 0.04 }, "exit")
          .to("[data-preloader-curtain]", { yPercent: -100, duration: 0.9, ease: "power4.inOut" }, `exit+=${lift}`)
          .fromTo("[data-preloader-lip]", { scaleY: 1 }, { scaleY: 0, duration: 0.5, ease: "power2.out" }, `exit+=${lift + 0.4}`)
          // The curtain still covers the hero's centre here, so the intro starts hidden and its rise is seen as the
          // curtain clears.
          .call(() => {
            unblock();
            reveal();
          }, [], `exit+=${lift + 0.32}`);
      }));
    }, root);

    return () => {
      cancelled = true;
      unblock();
      context.revert();
      render();
    };
  }, [onReveal]);

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className="pointer-events-auto fixed inset-0 z-[220] hidden overflow-hidden [html[data-preloader=run]_&]:block"
    >
      <div
        data-preloader-curtain
        className="absolute inset-0 flex flex-col justify-between bg-[radial-gradient(circle_at_76%_28%,rgba(173,109,244,0.36),transparent_38%),radial-gradient(circle_at_12%_92%,rgba(173,109,244,0.16),transparent_34%),linear-gradient(135deg,#f1f5f9,#ebdafd_72%)] p-[clamp(22px,5vw,72px)] text-[var(--text)] will-change-transform"
      >
        {/* Curved bottom edge: hangs below the viewport and only shows while the curtain lifts. */}
        <span
          data-preloader-lip
          aria-hidden="true"
          className="absolute inset-x-0 top-full -mt-px h-[clamp(64px,14vh,150px)] origin-top rounded-b-[50%_100%] bg-[linear-gradient(90deg,#ede2fc,#ebdafd)]"
        />

        <div data-preloader-fade className="flex items-start justify-between gap-5">
          <span className="text-[clamp(22px,2.2vw,30px)] font-bold leading-none tracking-[-0.045em] text-[var(--accent-deep)]">
            {profile.name}<span className="text-[var(--lavender-mist)]">.</span>
          </span>
          <span className="pt-1.5 font-mono text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-strong)] sm:text-[10px]">
            {profile.hero.portfolioLabel}
          </span>
        </div>

        <div className="flex items-start gap-1.5 self-center overflow-hidden pb-[0.04em] leading-[0.8] sm:gap-2">
          <span data-preloader-digits className="flex items-start gap-1.5 sm:gap-2">
            {/* The inline boot script updates the count before hydration, so its text legitimately differs. */}
            <span
              data-preloader-count
              suppressHydrationWarning
              className="block text-[clamp(124px,34vw,330px)] font-bold tabular-nums tracking-[-0.04em] text-[var(--text)] sm:tracking-[-0.08em]"
            >
              000
            </span>
            <span className="mt-[0.4em] font-mono text-[13px] text-[var(--accent-deep)] sm:text-[15px]">%</span>
          </span>
        </div>

        <div data-preloader-fade className="grid gap-3.5">
          <span className="relative block h-px overflow-hidden bg-[rgba(95,37,158,0.14)]">
            <span
              data-preloader-bar
              suppressHydrationWarning
              className="absolute inset-0 origin-left [transform:scaleX(0)] bg-[linear-gradient(90deg,var(--lavender-mist),var(--voltage-violet))]"
            />
          </span>
          <span className="flex flex-col gap-1.5 font-mono sm:flex-row sm:justify-between sm:gap-5 text-[9px] font-semibold uppercase tracking-[0.12em] text-[var(--muted-strong)] sm:text-[10px]">
            <span>{copy.preloaderLabel}</span>
            <span className="shrink-0">{profile.location}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
