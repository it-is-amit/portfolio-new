"use client";

import { useEffect, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { motion } from "framer-motion";
import { Home, Images, Mail, PanelsTopLeft, Route, Sparkles } from "lucide-react";
import type { LiquidGlass as LiquidGlassSurface, LiquidGlassMaterial } from "apple-liquid-glass-webgl";
import { navigation } from "@/data/profile";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { useLenis } from "@/components/SmoothScrollProvider";

const icons = {
  hero: Home,
  "what-i-do": PanelsTopLeft,
  skills: Sparkles,
  journey: Route,
  gallery: Images,
  contact: Mail,
} as const;

const targetId = (id: (typeof navigation)[number]["id"]) => id === "hero" ? "experience-story" : id;
const dockSpring = { type: "spring" as const, stiffness: 420, damping: 38, mass: 0.9 };
const dockIconSpring = { type: "spring" as const, stiffness: 320, damping: 24, mass: 0.65 };
const scrollEase = (time: number) => 1 - Math.pow(1 - time, 4);

const dockGlassMaterial = {
  refraction: 104,
  edgeReach: 0.24,
  edgeWidth: 0.16,
  dispersion: 1.45,
  frost: 0,
  backdropBlur: 0,
  body: 0.46,
  absorption: 0.18,
  tint: 0.04,
  rim: 0.86,
  reflection: 0.72,
  highlight: 0.92,
  lightAngle: 132,
  echo: 0.4,
  hairline: 0.88,
  hairWidth: 0.38,
} satisfies Partial<LiquidGlassMaterial>;

export function SectionDock() {
  const [activeId, setActiveId] = useState<(typeof navigation)[number]["id"]>("hero");
  const [darkBackdrop, setDarkBackdrop] = useState(false);
  const [heroTopGlassCorrection, setHeroTopGlassCorrection] = useState(false);
  const [heroDockBackdrop, setHeroDockBackdrop] = useState(false);
  const reducedMotion = usePrefersReducedMotion();
  const lenis = useLenis();
  const navRef = useRef<HTMLElement>(null);
  const glassRef = useRef<LiquidGlassSurface | null>(null);
  const darkBackdropRef = useRef(darkBackdrop);

  useEffect(() => {
    let mounted = true;
    let surface: LiquidGlassSurface | null = null;
    let glassElement: HTMLElement | null = null;

    const mountGlass = async () => {
      glassElement = navRef.current?.querySelector<HTMLElement>("[data-dock-glass]") ?? null;
      if (!glassElement) return;

      try {
        const { LiquidGlass } = await import("apple-liquid-glass-webgl");
        if (!mounted || !glassElement) return;

        surface = new LiquidGlass(glassElement, {
          backdrop: "auto",
          tint: 0.72,
          tintTone: darkBackdropRef.current ? "dark" : "light",
          frost: 0,
          material: dockGlassMaterial,
          live: false,
          maxDpr: 2,
          bleed: 44,
          zIndex: -1,
          respectReducedTransparency: true,
          // Keep the non-WebGL surface in sync with the same light/dark theme.
          fallback: (element) => element.classList.add("section-dock__surface--fallback"),
        });
        glassRef.current = surface;

        const readySurface = await surface.ready;
        if (mounted) navRef.current?.setAttribute("data-glass-state", readySurface.mode);
      } catch (error) {
        if (mounted) {
          glassElement?.setAttribute("data-liquid-glass", "fallback");
          glassElement?.classList.add("section-dock__surface--fallback");
          console.warn("Liquid glass dock could not be initialized; using its accessible solid fallback.", error);
        }
      }
    };

    const frame = window.requestAnimationFrame(() => void mountGlass());
    return () => {
      mounted = false;
      window.cancelAnimationFrame(frame);
      surface?.destroy();
      glassRef.current = null;
    };
  }, []);

  useEffect(() => {
    darkBackdropRef.current = darkBackdrop;
    glassRef.current?.update({ tintTone: darkBackdrop ? "dark" : "light" });
  }, [darkBackdrop]);

  useEffect(() => {
    glassRef.current?.refresh();
  }, [heroDockBackdrop]);

  useEffect(() => {
    const sections = navigation
      .map((item) => ({ item, element: document.getElementById(targetId(item.id)) }))
      .filter((entry): entry is { item: (typeof navigation)[number]; element: HTMLElement } => Boolean(entry.element));
    if (!sections.length) return;
    const galleryHasDarkStage = !reducedMotion;

    const updateActiveSection = () => {
      const readingLine = window.innerHeight * 0.48;
      let nextActive = sections[0].item.id;
      for (const { item, element } of sections) {
        if (element.getBoundingClientRect().top <= readingLine) nextActive = item.id;
        else break;
      }
      setActiveId((current) => current === nextActive ? current : nextActive);

      const dock = navRef.current;
      if (dock) {
        const box = dock.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const backdropElement = document.elementsFromPoint(x, y).find((element) => !dock.contains(element));
        const darkSurface = Boolean(backdropElement?.closest(".section-skills, .section-gallery__stage, .site-footer, .cap[data-tone='dark']"));
        const selectedWorkIsActive = galleryHasDarkStage && nextActive === "gallery";
        const atLightHeroTop = nextActive === "hero" && window.scrollY <= 1;
        const showHeroDockBackdrop = nextActive === "hero";
        setHeroTopGlassCorrection((current) => current === atLightHeroTop ? current : atLightHeroTop);
        setHeroDockBackdrop((current) => current === showHeroDockBackdrop ? current : showHeroDockBackdrop);
        const dark = !atLightHeroTop && (darkSurface || selectedWorkIsActive);
        setDarkBackdrop((current) => current === dark ? current : dark);
      }
    };

    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        frame = 0;
        updateActiveSection();
      });
    };

    updateActiveSection();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateActiveSection, { passive: true });
    return () => {
      if (frame) window.cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateActiveSection);
    };
  }, [reducedMotion]);

  const handleNavigation = (event: MouseEvent<HTMLAnchorElement>, id: (typeof navigation)[number]["id"]) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const target = document.getElementById(targetId(id));
    if (!target) return;

    event.preventDefault();
    const hash = `#${id}`;
    if (window.location.hash !== hash) window.history.pushState(null, "", hash);

    if (lenis) {
      lenis.scrollTo(target, {
        duration: reducedMotion ? 0 : 1.15,
        immediate: reducedMotion,
        easing: scrollEase,
        offset: 0,
      });
    } else {
      target.scrollIntoView({ behavior: reducedMotion ? "auto" : "smooth", block: "start" });
    }
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[150] flex justify-center px-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:px-4">
      <motion.nav
        ref={navRef}
        aria-label="Explore portfolio sections"
        className="section-dock pointer-events-auto relative isolate flex max-w-full items-center gap-1 rounded-full p-1.5 sm:gap-1.5 sm:p-2 max-[400px]:gap-0.5 max-[400px]:p-1"
        data-dock-tone={darkBackdrop ? "dark" : "light"}
        data-dock-at-hero-top={heroTopGlassCorrection ? "true" : undefined}
        initial={reducedMotion ? { opacity: 0 } : { opacity: 0, y: 18, scale: 0.96 }}
        animate={reducedMotion ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
        transition={reducedMotion ? { duration: 0.16 } : dockSpring}
      >
        <span
          className={`section-dock__hero-backdrop${heroDockBackdrop ? " section-dock__hero-backdrop--visible" : ""}`}
          aria-hidden="true"
        />
        <span className="section-dock__surface pointer-events-none absolute inset-0 rounded-full" data-dock-glass aria-hidden="true" />
        {navigation.map((item) => {
          const Icon = icons[item.id];
          const active = activeId === item.id;
          return (
            <motion.a
              className="section-dock__link group relative grid size-11 shrink-0 place-items-center rounded-full text-[var(--dock-icon-color)] outline-none transition-colors duration-300 hover:text-[var(--dock-icon-hover)] focus-visible:z-10 focus-visible:text-[var(--dock-icon-hover)] focus-visible:ring-2 focus-visible:ring-[var(--dock-icon-hover)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--dock-focus-offset)] active:text-[var(--dock-icon-active)] sm:size-12 max-[400px]:size-10 max-[360px]:size-[38px]"
              href={`#${item.id}`}
              key={item.id}
              aria-label={item.label}
              aria-current={active ? "location" : undefined}
              title={item.label}
              onClick={(event) => handleNavigation(event, item.id)}
              whileTap={reducedMotion ? undefined : { scale: 0.93 }}
              transition={dockIconSpring}
            >
              <span className="section-dock__hover absolute inset-0 rounded-full" aria-hidden="true" />
              {active && (reducedMotion ? (
                <span className="section-dock__active absolute inset-1 rounded-full" aria-hidden="true" />
              ) : (
                <motion.span
                  className="section-dock__active absolute inset-1 rounded-full"
                  layoutId="section-dock-active"
                  transition={dockSpring}
                  aria-hidden="true"
                />
              ))}
              <Icon className="relative z-[1]" size={19} strokeWidth={active ? 2.15 : 1.8} aria-hidden="true" />
              <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 translate-y-1 whitespace-nowrap rounded-md bg-[var(--midnight-ink)] px-2 py-1 font-mono text-[8px] uppercase tracking-[0.08em] text-white opacity-0 shadow-sm transition-[opacity,transform] duration-150 group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:translate-y-0 group-focus-visible:opacity-100 motion-reduce:transition-none">
                {item.label}
              </span>
              {active && <span className="section-dock__indicator absolute -bottom-0.5 z-[1] size-1 rounded-full" aria-hidden="true" />}
            </motion.a>
          );
        })}
      </motion.nav>
    </div>
  );
}
