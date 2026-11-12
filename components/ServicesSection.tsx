"use client";

import { useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { CapabilityPreview } from "@/components/CapabilityPreview";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { copy, type CapabilityStage } from "@/data/profile";
import { clearCssVars, gsap, registerGsapPlugins, revealSectionHeading, ScrollTrigger, seedCssVars } from "@/lib/gsap-client";

/*
 * Showcase: one centred composition (heading, subtitle, large dashboard preview) inside a tall
 * `.cap` runway whose child is `position: sticky`. While the hero blurs away, the heading and preview
 * rise over it with no covering layer; the section's own background only switches on once the hero
 * has gone (same ivory, so the switch is invisible). Then the preview pins and one scrubbed GSAP
 * timeline maps the runway's scroll progress (0 → 1) onto CSS custom properties read by the
 * preview, the section background (four soft colour states ending on the next section's night
 * gradient) and the glows behind the preview, which grow with scroll. Native sticky (no GSAP
 * pin-spacer) keeps it friendly with Lenis. Reduced motion or short viewports get the finished
 * product as a static figure.
 *
 * Laptop and larger (1024px+) turn the build into a multiplayer session: role cursors (UX designer,
 * UI designer, visual designer, frontend developer) each do their own part of the work on the same
 * scrubbed timeline. Smaller screens keep the single scripted cursor.
 *
 * Every custom property is tweened through the `cssVars` plugin (lib/gsap-client), which never calls
 * getComputedStyle mid-scroll, so a first scroll through the section stays as light as later ones.
 *
 * Styling is Tailwind; the shared --cap-* colour tokens, typed @property registrations and the
 * preview's internals live in globals.css.
 */
const SCROLL_JOURNEY_QUERY = "(prefers-reduced-motion: no-preference) and (min-height: 600px)";
/** Same breakpoint as Tailwind's `lg`, which shows the cursor layer in CapabilityPreview. */
const MULTIPLAYER_QUERY = "(min-width: 1024px)";
/** Timeline unit at which each stage begins (index 0 = stage 1). The timeline is 10 units long. */
const STAGE_UNITS = [0, 1.7, 4.7, 8] as const;
/** Scroll progress at which each stage begins. */
const STAGE_STARTS = STAGE_UNITS.map((unit) => unit / 10);
/** Progress after which the background is mostly dark (the section dock switches to dark glass). */
const DARK_FROM = 0.53;

function subscribeToQuery(query: string) {
  return (onChange: () => void) => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") return () => undefined;
    const media = window.matchMedia(query);
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  };
}

const subscribeToJourneyQuery = subscribeToQuery(SCROLL_JOURNEY_QUERY);
const getJourneySnapshot = () => typeof window !== "undefined" && window.matchMedia(SCROLL_JOURNEY_QUERY).matches;
const subscribeToMultiplayerQuery = subscribeToQuery(MULTIPLAYER_QUERY);
const getMultiplayerSnapshot = () => typeof window !== "undefined" && window.matchMedia(MULTIPLAYER_QUERY).matches;
const getServerSnapshot = () => false;

/** Revenue series (chart viewBox units, 0-128) the visual designer's cursor traces; matches series30 in CapabilityPreview. */
const CHART_SERIES = [104, 92, 98, 80, 86, 68, 74, 56, 62, 44, 36, 26] as const;
/** The chart's plotted area in canvas units: x 229-665; the 438 × 128 viewBox is letterboxed into 436 × 134. */
const CHART_BOX = { x: 229, width: 436, y: 248.3, scale: 0.995 } as const;

function stageFromProgress(progress: number): CapabilityStage {
  if (progress >= STAGE_STARTS[3]) return 4;
  if (progress >= STAGE_STARTS[2]) return 3;
  if (progress >= STAGE_STARTS[1]) return 2;
  return 1;
}

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const journeyRef = useRef<HTMLDivElement>(null);
  const scrollStageRef = useRef<CapabilityStage>(1);
  const darkRef = useRef(false);
  const reducedMotion = usePrefersReducedMotion();
  const scrollMode = useSyncExternalStore(subscribeToJourneyQuery, getJourneySnapshot, getServerSnapshot);
  const multiplayer = useSyncExternalStore(subscribeToMultiplayerQuery, getMultiplayerSnapshot, getServerSnapshot);
  const [scrollStage, setScrollStage] = useState<CapabilityStage>(1);
  const [dark, setDark] = useState(false);
  const stage = scrollMode ? scrollStage : 4;

  // Heading reveal lives in its own effect so a journey-mode change (e.g. a resize across the
  // 600px height threshold) never replays it.
  useLayoutEffect(() => {
    const heading = sectionRef.current?.querySelector<HTMLElement>("#services-title");
    if (!heading || reducedMotion) return;
    registerGsapPlugins();
    const context = gsap.context(() => {
      revealSectionHeading(heading);
    });
    return () => context.revert();
  }, [reducedMotion]);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    const journey = journeyRef.current;
    if (!section || !journey) return;

    registerGsapPlugins();
    let refreshFrame = 0;
    const cleanups: Array<() => void> = [];
    const context = gsap.context(() => {
      if (!scrollMode) return;

      // Every (element, custom property) a tween animates, so all start values can be read in one
      // pass (seedCssVars) instead of one forced style recalculation per tween.
      const seedPairs: Array<readonly [Element, string]> = [];
      const cssVars = (targets: Element | Element[], values: Record<string, number>) => {
        for (const target of Array.isArray(targets) ? targets : [targets]) {
          for (const name of Object.keys(values)) seedPairs.push([target, name] as const);
        }
        return { cssVars: values };
      };

      const part = (name: string) => journey.querySelector<HTMLElement>(`[data-cap-part="${name}"]`);
      const preview = journey.querySelector<HTMLElement>("[data-cap-preview]");
      const figure = part("figure");
      const inner = part("inner");
      const head = part("head");
      const stageEl = part("stage");
      const all = (selector: string) => gsap.utils.toArray<HTMLElement>(selector, journey);
      const fx = (...names: string[]) => all(names.map((name) => `[data-cap-fx="${name}"]`).join(","));
      const slots = { type: all('[data-cap-slot="type"]'), control: all('[data-cap-slot="control"]'), visual: all('[data-cap-slot="visual"]') };
      const builds = all("[data-cap-build]");
      const regions = all("[data-cap-region]");
      const backdrop = part("backdrop");
      const guides = part("guides");
      if (!preview || !figure || !inner || !head || !stageEl || !backdrop || !guides || !builds.length) return;
      // Values that change on every scroll frame are written only on the few elements that read them
      // (they inherit from there), not on the section root, so each frame restyles a handful of nodes
      // instead of the whole section. --cap-k3 stays on the root: the shared --cap-* colour tokens use it.
      const glowLayers = [backdrop, ...all("[data-cap-glow]")];
      const driftLayers = [backdrop, guides];

      // --cap-shift: if heading + preview don't fit one viewport, the sticky element's top goes
      // negative by the heading block's height, so the heading arrives with the preview and then
      // scrolls away while the preview pins. If everything fits, nothing scrolls away.
      // Re-measured before every ScrollTrigger refresh (resize, font load, orientation change).
      let shift = 0;
      const measureShift = () => {
        journey.style.setProperty("--cap-shift", "0px");
        const styles = getComputedStyle(inner);
        const padTop = Number.parseFloat(styles.paddingTop) || 0;
        const padBottom = Number.parseFloat(styles.paddingBottom) || 0;
        const overflow = stageEl.offsetTop + stageEl.offsetHeight + padBottom - inner.clientHeight;
        shift = overflow > 0 ? Math.max(0, Math.round(stageEl.offsetTop - padTop)) : 0;
        journey.style.setProperty("--cap-shift", `${shift}px`);
        journey.dataset.fit = shift > 0 ? "preview" : "all";
      };
      measureShift();
      ScrollTrigger.addEventListener("refreshInit", measureShift);
      cleanups.push(() => {
        ScrollTrigger.removeEventListener("refreshInit", measureShift);
        journey.style.removeProperty("--cap-shift");
        delete journey.dataset.fit;
      });

      // The heading hands over to the preview: it softens and fades while it scrolls away.
      gsap.fromTo(
        head,
        { opacity: 1, filter: "blur(0px)" },
        {
          opacity: () => (shift > 0 ? 0 : 1),
          filter: () => (shift > 0 ? "blur(8px)" : "blur(0px)"),
          ease: "power1.in",
          scrollTrigger: { trigger: journey, start: "top top", end: () => `+=${Math.max(1, shift)}`, scrub: true, invalidateOnRefresh: true },
        },
      );

      // Arrival: while the hero blurs away, the preview rises into its pinned position a little
      // faster than the page (a child of the sticky element, never the sticky element itself, so
      // native sticky is untouched).
      gsap.fromTo(
        figure,
        { y: () => window.innerHeight * 0.12, scale: 0.94 },
        {
          y: 0,
          scale: 1,
          ease: "none",
          scrollTrigger: { trigger: journey, start: "top bottom", end: "top top", scrub: 0.4, invalidateOnRefresh: true },
        },
      );
      // --cap-arrive tracks the arrival exactly (no smoothing). The section background stays fully
      // transparent until the very end of it (see --cap-solid), so nothing covers the fading hero.
      gsap.fromTo(
        journey,
        cssVars(journey, { "--cap-arrive": 0 }),
        { ...cssVars(journey, { "--cap-arrive": 1 }), ease: "none", scrollTrigger: { trigger: journey, start: "top bottom", end: "top top", scrub: true } },
      );
      // Glow behind the preview (and the ambient light) builds up over the whole journey.
      gsap.fromTo(
        glowLayers,
        cssVars(glowLayers, { "--cap-glow": 0 }),
        { ...cssVars(glowLayers, { "--cap-glow": 1 }), ease: "none", scrollTrigger: { trigger: journey, start: "top top", end: "bottom bottom", scrub: 0.3 } },
      );

      // Entry: the dashboard regions (sidebar, top bar, cards, table) draw in while the section
      // scrolls into place, so the very first scroll already moves the preview.
      gsap.fromTo(
        regions,
        cssVars(regions, { "--cap-r": 0 }),
        {
          ...cssVars(regions, { "--cap-r": 1 }),
          ease: "none",
          stagger: 0.18,
          scrollTrigger: { trigger: journey, start: "top 88%", end: "top 18%", scrub: true },
        },
      );

      // The journey's starting frame lives in CSS (`.cap[data-mode="scroll"] …` in globals.css), so
      // every tween below reads its start value from there and never needs a gsap.set().

      const sync = (progress: number) => {
        const next = stageFromProgress(progress);
        if (next !== scrollStageRef.current) {
          scrollStageRef.current = next;
          setScrollStage(next);
        }
        const nextDark = progress >= DARK_FROM;
        if (nextDark !== darkRef.current) {
          darkRef.current = nextDark;
          setDark(nextDark);
        }
      };

      // Laptop and larger: the role cursors that perform the build (CapabilityPreview, `collaborators`).
      const cursorOf = (id: string) => journey.querySelector<HTMLElement>(`[data-cap-mp="${id}"]`);
      const crew = { ux: cursorOf("ux"), ui: cursorOf("ui"), visual: cursorOf("visual"), dev: cursorOf("dev") };
      const drawFrame = journey.querySelector<HTMLElement>('[data-cap-fx="mp-frame"]');
      const session =
        multiplayer && crew.ux && crew.ui && crew.visual && crew.dev && drawFrame
          ? { ux: crew.ux, ui: crew.ui, visual: crew.visual, dev: crew.dev, frame: drawFrame }
          : null;

      // One timeline, 10 units long: unit / 10 = scroll progress (see STAGE_STARTS). Every value
      // below is scrubbed by scroll position, so pausing, reversing and jumping all land on the
      // exact matching frame. No timers, no React state per frame. All values are constants, so the
      // tweens never need re-initialising on refresh (only `start` is re-measured, which ScrollTrigger
      // always does).
      const timeline = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: journey,
          // The build starts the moment the preview pins (after the heading has scrolled away).
          start: () => `top+=${shift} top`,
          end: "bottom bottom",
          // Lenis already smooths the scroll, so only a short catch-up: the build tracks it almost 1:1.
          scrub: 0.2,
          onUpdate: (self) => sync(self.progress),
        },
      });
      /** Tweens custom properties on `targets`, starting from wherever the timeline left them. */
      const tween = (
        targets: Element | Element[],
        values: Record<string, number>,
        at: number,
        duration: number,
        vars: gsap.TweenVars = {},
      ) => timeline.to(targets, { ...cssVars(targets, values), duration, ...vars }, at);
      const show = (targets: HTMLElement[], at: number, duration = 0.22) => tween(targets, { "--cap-o": 1 }, at, duration);
      const hide = (targets: HTMLElement[], at: number, duration = 0.22, stagger = 0) =>
        tween(targets, { "--cap-o": 0 }, at, duration, { stagger });
      const build = (group: string, at: number, stagger = 0) =>
        tween(all(`[data-cap-build="${group}"]`), { "--cap-b": 1 }, at, 0.3, { ease: "power2.out", stagger });

      // Journey position (drives the ambient light and guides).
      tween(driftLayers, { "--cap-p": 1 }, 0, 10);

      // Section colour journey: long, gently eased crossfades that each span most of a stage
      // (ivory → lavender wash → deep violet → the Tools & Tech night gradient).
      tween(backdrop, { "--cap-k2": 1 }, 0.8, 2.4, { ease: "sine.inOut" });
      tween(journey, { "--cap-k3": 1 }, 3.7, 2.8, { ease: "sine.inOut" });
      tween(backdrop, { "--cap-k4": 1 }, 7.0, 2.6, { ease: "sine.inOut" });

      // 01 · Wireframe (0 → 1.7): the dashboard's structure is placed piece by piece. In the
      // multiplayer session the UX designer draws each piece first (see below), so builds follow it.
      if (!session) {
        build("side", 0.05, 0.06);
        build("top", 0.28, 0.05);
        build("kpi", 0.42, 0.07);
        build("chart", 0.7);
        build("sources", 0.82);
        build("table", 0.92, 0.05);
        show(fx("flow"), 1.15, 0.3);
      }

      // 02 · UI design (1.7 → 4.7): type, then colour, then controls and charts, then refinement.
      hide(fx("label", "flow"), 1.7, 0.3);
      tween(preview, { "--cap-grid": 0 }, 1.75, 1.4);
      tween(slots.type, { "--cap-t": 1 }, 1.7, 0.45, { ease: "power2.inOut", stagger: { amount: 0.75 } });
      tween(preview, { "--cap-c": 1 }, 2.35, 0.85, { ease: "power1.inOut" });
      tween(slots.control, { "--cap-t": 1 }, 2.5, 0.45, { ease: "power2.inOut", stagger: { amount: 0.3 } });
      tween(slots.visual, { "--cap-t": 1 }, 2.95, 0.5, { ease: "power2.inOut", stagger: { amount: 0.35 } });
      // In the session the visual designer's cursor traces the chart line, so the line draws at an
      // even pace, and the refinement pass (radii, shadows) follows once it is done.
      tween(preview, { "--cap-line": 1 }, 3.15, 0.7, { ease: session ? "none" : "power1.inOut" });
      tween(preview, { "--cap-d": 1 }, session ? 3.95 : 3.55, session ? 0.5 : 0.8, { ease: "power1.inOut" });
      show(fx("select"), 2.0);
      show(fx("tag"), 2.8);
      show(fx("redline"), 3.7);
      hide(fx("select", "tag", "redline"), 4.5, 0.25);

      // 03 · Frontend (4.7 → 8): components register, the UI is wired to data (skeleton, then
      // values count up and the chart redraws), and a cursor exercises real states.
      show(fx("outline-side"), 4.8, 0.25);
      show(fx("code"), 4.9, 0.35);
      show(fx("outline-kpi"), 4.95, 0.25);
      tween(preview, { "--cap-load": 1 }, 4.95, 0.25);
      tween(preview, { "--cap-live": 1 }, 5.2, 0.05);
      tween(preview, { "--cap-load": 0 }, 5.3, 0.25);
      tween(preview, { "--cap-n": 1 }, 5.3, 0.9, { ease: "power1.out" });
      show(fx("outline-chart"), 5.2, 0.25);
      show(fx("outline-table"), 5.45, 0.25);
      show(fx("toast"), 5.6, 0.25);
      // Interaction states: nav hover, chart range switch (press), table row lift.
      tween(preview, { "--cap-hn": 1 }, 6.15, 0.15);
      tween(preview, { "--cap-hn": 0 }, 6.45, 0.15);
      tween(preview, { "--cap-press": 1 }, 6.95, 0.15);
      tween(preview, { "--cap-range": 1 }, 7.0, 0.6, { ease: "power1.inOut" });
      tween(preview, { "--cap-press": 0 }, 7.12, 0.15);
      tween(preview, { "--cap-lift": 1 }, 7.72, 0.2);
      if (!session) {
        // Below 1024px a single scripted cursor (canvas px) performs them.
        tween(preview, { "--cap-cur": 1 }, 5.75, 0.2);
        tween(preview, { "--cap-cx": 70, "--cap-cy": 118 }, 5.75, 0.45, { ease: "power2.inOut" });
        tween(preview, { "--cap-cx": 646, "--cap-cy": 214 }, 6.4, 0.55, { ease: "power2.inOut" });
        tween(preview, { "--cap-cx": 520, "--cap-cy": 530 }, 7.35, 0.45, { ease: "power2.inOut" });
        tween(preview, { "--cap-cur": 0 }, 8.0, 0.3);
      }

      // 04 · Final product (8 → 10): tooling steps away, depth and the responsive view arrive.
      hide(fx("toast"), 7.9, 0.2);
      hide(fx("code"), 7.95, 0.3);
      hide(fx("outline-table", "outline-chart", "outline-kpi", "outline-side"), 8.0, 0.25, 0.06);
      tween(preview, { "--cap-lift": 0 }, 8.0, 0.3);
      tween(preview, { "--cap-ship": 1 }, 8.25, 0.8, { ease: "power2.out" });
      tween(fx("phone"), { "--cap-o": 1 }, 8.7, 0.8, { ease: "power2.out" });

      if (session) {
        // ---- Multiplayer session. Positions are canvas units (960 × 600), pointer tip first. ----
        const { ux, ui, visual, dev, frame } = session;
        const chip = (id: string) => fx(`mp-${id}`);
        const say = (id: string, from: number, to: number) => {
          show(chip(id), from, 0.08);
          hide(chip(id), to, 0.08);
        };
        /** Name tag flips left / up near the right and bottom edges, so it is never clipped. */
        const edges = (x: number, y: number) => ({ "--tf": x > 790 ? 1 : 0, "--tv": y > 540 ? 1 : 0 });
        const place = (cursor: HTMLElement, x: number, y: number, at: number) =>
          tween(cursor, { "--x": x, "--y": y, ...edges(x, y) }, at, 0.001);
        const appear = (cursor: HTMLElement, at: number) => tween(cursor, { "--o": 1 }, at, 0.1);
        const leave = (cursor: HTMLElement, at: number) => tween(cursor, { "--o": 0 }, at, 0.15);
        /** A hand-moved glide: separate x / y easing gives the slight arc of a real mouse path. */
        const glide = (cursor: HTMLElement, x: number, y: number, at: number, duration: number) => {
          tween(cursor, { "--x": x }, at, duration, { ease: "power2.inOut" });
          tween(cursor, { "--y": y }, at, duration, { ease: "sine.inOut" });
          tween(cursor, edges(x, y), at + duration * 0.4, 0.06);
        };
        /** A straight drag (drawing, resizing, tracing). */
        const drag = (cursor: HTMLElement, x: number, y: number, at: number, duration: number, ease = "power1.inOut") => {
          tween(cursor, { "--x": x, "--y": y }, at, duration, { ease });
          tween(cursor, edges(x, y), at + duration * 0.4, 0.06);
        };
        const click = (cursor: HTMLElement, at: number) => {
          tween(cursor, { "--k": 1 }, at, 0.04, { ease: "power2.out" });
          tween(cursor, { "--k": 0 }, at + 0.06, 0.1);
        };

        // UX designer (0 → 2): draws a frame for each part of the layout and the part builds inside
        // it; the chart frame is drawn too large and resized to fit. Then annotates the user flow.
        place(ux, 96, 300, 0);
        appear(ux, 0);
        say("ux-frame", 0.02, 1.3);
        const blocks: ReadonlyArray<{ group: string; box: readonly [number, number, number, number]; stagger?: number; overshoot?: readonly [number, number] }> = [
          { group: "side", box: [14, 20, 173, 240], stagger: 0.06 },
          { group: "top", box: [212, 14, 936, 49], stagger: 0.05 },
          { group: "kpi", box: [212, 84, 936, 177], stagger: 0.05 },
          { group: "chart", box: [212, 192, 682, 412], overshoot: [704, 430] },
          { group: "sources", box: [696, 192, 936, 412] },
          { group: "table", box: [229, 443, 919, 578], stagger: 0.05 },
        ];
        let t = 0.002;
        blocks.forEach(({ group, box: [x0, y0, x1, y1], stagger, overshoot }, index) => {
          const travel = index === 0 ? 0.058 : 0.07;
          glide(ux, x0, y0, t, travel);
          t += travel;
          tween(frame, { "--mx": x0, "--my": y0, "--mw": 0, "--mh": 0 }, t - 0.002, 0.001);
          show([frame], t, 0.02);
          const [dx, dy] = overshoot ?? [x1, y1];
          tween(frame, { "--mw": dx - x0, "--mh": dy - y0 }, t, 0.13, { ease: "power1.inOut" });
          drag(ux, dx, dy, t, 0.13);
          t += 0.13;
          if (overshoot) {
            tween(frame, { "--mw": x1 - x0, "--mh": y1 - y0 }, t + 0.01, 0.08, { ease: "power2.inOut" });
            drag(ux, x1, y1, t + 0.01, 0.08, "power2.inOut");
            t += 0.09;
          }
          build(group, t - 0.04, stagger);
          hide([frame], t + 0.005, 0.05);
        });
        glide(ux, 650, 238, 1.31, 0.09);
        say("ux-flow", 1.38, 1.72);
        show(fx("flow"), 1.4, 0.25);
        drag(ux, 566, 290, 1.42, 0.16, "power2.inOut");
        glide(ux, 150, 520, 1.74, 0.28);
        leave(ux, 1.88);

        // UI designer (1.2 → 4.6): text styles, the brand fill, a component, spacing.
        place(ui, 470, 330, 1.18);
        appear(ui, 1.2);
        glide(ui, 360, 250, 1.3, 0.28);
        glide(ui, 250, 32, 1.6, 0.1);
        click(ui, 1.71);
        say("ui-type", 1.68, 2.24);
        glide(ui, 300, 128, 1.86, 0.11);
        click(ui, 1.98);
        glide(ui, 60, 84, 2.2, 0.12);
        click(ui, 2.34);
        say("ui-fill", 2.3, 2.76);
        glide(ui, 236, 73, 2.62, 0.13);
        click(ui, 2.78);
        say("ui-component", 2.76, 3.3);
        glide(ui, 520, 150, 3.25, 0.25);
        glide(ui, 389, 148, 3.55, 0.11);
        click(ui, 3.68);
        say("ui-gap", 3.66, 4.3);
        glide(ui, 300, 520, 4.32, 0.3);
        leave(ui, 4.45);

        // Visual designer (2.5 → 5.3): places the chart, traces its line as it draws, adds depth.
        place(visual, 830, 480, 2.48);
        appear(visual, 2.5);
        glide(visual, 445, 312, 2.8, 0.12);
        click(visual, 2.93);
        say("visual-chart", 2.9, 3.12);
        const point = (index: number) =>
          [CHART_BOX.x + (CHART_BOX.width * index) / (CHART_SERIES.length - 1), CHART_BOX.y + CHART_SERIES[index] * CHART_BOX.scale] as const;
        glide(visual, ...point(0), 3.0, 0.13);
        say("visual-line", 3.13, 3.9);
        const segment = 0.7 / (CHART_SERIES.length - 1);
        for (let index = 1; index < CHART_SERIES.length; index += 1) {
          const [x, y] = point(index);
          tween(visual, { "--x": x, "--y": y }, 3.15 + (index - 1) * segment, segment);
        }
        glide(visual, 816, 300, 3.92, 0.12);
        click(visual, 4.05);
        say("visual-shadow", 4.02, 4.5);
        glide(visual, 760, 500, 4.55, 0.5);
        leave(visual, 5.15);

        // Frontend developer (4.35 → 8.3): wires data, then tests the interaction states above.
        place(dev, 560, 480, 4.33);
        appear(dev, 4.35);
        glide(dev, 300, 130, 4.78, 0.14);
        click(dev, 4.94);
        say("dev-wire", 4.9, 5.62);
        glide(dev, 445, 300, 5.05, 0.13);
        click(dev, 5.2);
        glide(dev, 560, 505, 5.3, 0.13);
        click(dev, 5.45);
        say("dev-test", 5.7, 7.86);
        glide(dev, 70, 118, 5.75, 0.45);
        glide(dev, 646, 214, 6.4, 0.55);
        click(dev, 6.95);
        glide(dev, 520, 530, 7.35, 0.45);
        say("dev-deploy", 7.92, 8.2);
        click(dev, 8.02);
        leave(dev, 8.12);
      }

      timeline.to({}, { duration: 0.01 }, 9.99);

      // One style read for every start value above, before any of these tweens has rendered.
      seedCssVars(seedPairs);

      sync(timeline.scrollTrigger?.progress ?? 0);
    }, section);

    // The journey changes page height, so neighbouring triggers need fresh measurements.
    refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.cancelAnimationFrame(refreshFrame);
      cleanups.forEach((cleanup) => cleanup());
      context.revert();
      clearCssVars(journey);
    };
  }, [reducedMotion, scrollMode, multiplayer]);

  return (
    <section
      className="section-services relative overflow-x-clip text-[var(--midnight-ink)]"
      id="what-i-do"
      ref={sectionRef}
      aria-labelledby="services-title"
    >
      <div
        className={[
          "cap group/cap relative",
          "[--cap-pad-top:clamp(62px,8vh,80px)] max-md:[--cap-pad-top:66px]",
          // Scroll runway: one viewport of pinned composition plus the scrubbed journey.
          "data-[mode=scroll]:h-[calc(100svh+var(--cap-shift)+520vh)] max-md:data-[mode=scroll]:h-[calc(100svh+400vh)]",
          "data-[mode=static]:bg-[var(--surface-warm)] data-[mode=static]:pt-[clamp(76px,9vw,136px)] data-[mode=static]:pb-[clamp(48px,6vw,96px)]",
        ].join(" ")}
        ref={journeyRef}
        data-mode={scrollMode ? "scroll" : "static"}
        data-stage={stage}
        // Over the dark states the section dock reads this to switch to its dark glass.
        data-tone={scrollMode && dark ? "dark" : undefined}
      >
        <div
          className="relative group-data-[mode=scroll]/cap:sticky group-data-[mode=scroll]/cap:top-[calc(-1*var(--cap-shift))] group-data-[mode=scroll]/cap:h-[calc(100svh+var(--cap-shift))] group-data-[mode=scroll]/cap:overflow-clip"
        >
          {/* Section background: four-state colour journey, ambient light and a faint grid. */}
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" data-cap-part="backdrop" aria-hidden="true">
            <span className="absolute inset-0 bg-[color-mix(in_oklch,#211a39_calc(var(--cap-k3)*100%),color-mix(in_oklab,#efe6fc_calc(var(--cap-k2)*100%),var(--surface-warm)))] opacity-[var(--cap-solid)]" />
            {/* Violet tint that peaks mid-way through the dark crossfade, so it passes through violet, not grey. */}
            <span className="absolute inset-0 bg-[var(--ultra-violet)] opacity-[calc(var(--cap-k3)*(1-var(--cap-k3))*1.5*var(--cap-solid))]" />
            {/*
              State 04: the Tools & Tech night gradient, mirrored vertically. That section's top
              edge (gradient start, centre highlight, top-right violet glow) is reproduced on this
              layer's bottom edge, so the two surfaces meet without a seam when the showcase releases.
            */}
            <span className="absolute inset-0 bg-[radial-gradient(ellipse_at_52%_100%,rgba(255,255,255,0.045),transparent_72%),radial-gradient(ellipse_72%_88%_at_92%_96%,rgba(134,47,231,0.17),transparent_66%),radial-gradient(ellipse_58%_72%_at_9%_22%,rgba(196,151,63,0.055),transparent_68%),linear-gradient(42deg,#171521_0%,#10151e_54%,#191523_100%)] opacity-[var(--cap-k4)]" />
            {/* Ambient light: drifts with the journey and builds up with --cap-glow. */}
            <span className="absolute top-1/2 left-1/2 aspect-square w-[64vmax] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--voltage-violet)_15%,transparent),transparent)] opacity-[calc((0.35+0.65*var(--cap-p,1))*var(--cap-glow,1))] [transform:translate3d(calc(-50%_-_36vw_+_var(--cap-p,1)*20vw),calc(-50%_-_14vh_+_var(--cap-p,1)*18vh),0)] [@media(prefers-reduced-transparency:reduce)]:hidden" />
            <span className="absolute top-1/2 left-1/2 aspect-square w-[64vmax] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--lavender-mist)_18%,transparent),transparent)] opacity-[calc((0.3+0.7*var(--cap-p,1))*var(--cap-glow,1))] [transform:translate3d(calc(-50%_+_34vw_-_var(--cap-p,1)*16vw),calc(-50%_+_18vh_-_var(--cap-p,1)*22vh),0)] [@media(prefers-reduced-transparency:reduce)]:hidden" />
            <span className="absolute top-1/2 left-1/2 aspect-square w-[52vmax] rounded-full bg-[radial-gradient(closest-side,color-mix(in_srgb,var(--champagne-gold)_16%,transparent),transparent)] opacity-[clamp(0,calc((var(--cap-p,1)-0.72)*3.6),1)] [transform:translate3d(calc(-50%_+_(var(--cap-p,1)_-_0.5)*12vw),calc(-50%_+_16vh),0)] [@media(prefers-reduced-transparency:reduce)]:hidden" />
            {/* Faint grid: blueprint-strong while wireframing, a trace once it ships; drifts with scroll. */}
            <span className="absolute inset-x-0 -inset-y-16 bg-[linear-gradient(to_right,color-mix(in_srgb,var(--cap-grid-ink)_6%,transparent)_1px,transparent_1px),linear-gradient(to_bottom,color-mix(in_srgb,var(--cap-grid-ink)_6%,transparent)_1px,transparent_1px)] bg-[size:64px_64px] bg-top [mask-image:radial-gradient(ellipse_72%_64%_at_50%_58%,#000_10%,transparent_78%)] opacity-[calc((0.35+0.65*clamp(0,1-var(--cap-p,1)*1.5,1))*var(--cap-solid))] [transform:translate3d(0,calc(var(--cap-p,1)*-64px),0)]" />
          </div>

          <div
            className="relative z-[1] mx-auto flex w-full max-w-[1480px] flex-col items-center px-[clamp(20px,5vw,84px)] group-data-[mode=scroll]/cap:h-full group-data-[mode=scroll]/cap:pt-[var(--cap-pad-top)] group-data-[mode=scroll]/cap:pb-[calc(var(--layout-dock-clearance)-2px)] group-data-[fit=all]/cap:justify-center"
            data-cap-part="inner"
          >
            <header className="grid max-w-[1000px] justify-items-center gap-[clamp(10px,1.6vh,16px)] text-center" data-cap-part="head">
              <h2
                className="m-0 text-[clamp(2rem,min(3.7vw,6.6vh),4.25rem)] md:max-lg:text-[clamp(2rem,6vw,3.5rem)] leading-[0.98] font-semibold tracking-[-0.065em] text-[var(--cap-ink)]"
                id="services-title"
                data-section-heading
              >
                <span className="inline-block">{copy.servicesTitleLead}</span>{" "}
                <span className="inline-block text-[var(--cap-accent)]">{copy.servicesTitleAccent}</span>
              </h2>
              <p className="m-0 text-[length:min(clamp(0.95rem,1.1vw,1.08rem),3.4vw)] leading-[1.45] tracking-[-0.02em] whitespace-nowrap text-[var(--cap-ink-soft)]">
                {copy.servicesSubtitle}
              </p>
            </header>

            <div className="relative mt-[clamp(26px,3.4vh,36px)] flex w-full justify-center" data-cap-part="stage">
              <figure
                className="@container relative m-0 w-[min(100%,1100px)] group-data-[mode=scroll]/cap:w-[min(100%,1240px,calc((100svh-var(--cap-pad-top)-clamp(30px,2.6vw,38px)-var(--layout-dock-clearance)-18px)*1.6))]"
                data-cap-part="figure"
                aria-label="A concept analytics dashboard, built up from wireframe and UI design to a frontend wired to live data and the shipped product"
              >
                {/* Glow behind the preview: grows in size and intensity with scroll. Kept within the pinned
                    area (closest-side fades out at its box edge), so it is never clipped. */}
                <span
                  className="pointer-events-none absolute -inset-x-[28%] -inset-y-[13%] -z-10 rounded-[50%] bg-[radial-gradient(closest-side,rgba(134,47,231,0.5),rgba(173,109,244,0.26)_58%,transparent)] opacity-[calc(0.18+0.82*var(--cap-glow,1))] [scale:calc(0.72+0.38*var(--cap-glow,1))]"
                  data-cap-glow
                  aria-hidden="true"
                />
                <span
                  className="pointer-events-none absolute inset-x-[6%] -inset-y-[8%] -z-10 translate-x-[16%] translate-y-[3%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(226,43,164,0.24),rgba(196,151,63,0.1)_60%,transparent)] opacity-[clamp(0,calc((var(--cap-glow,1)-0.35)*1.6),1)] [scale:calc(0.8+0.3*var(--cap-glow,1))]"
                  data-cap-glow
                  aria-hidden="true"
                />

                {/* Design-tool guides around the canvas: present while designing, gone once it ships. */}
                <span className="pointer-events-none absolute inset-0 -z-[1] opacity-[clamp(0,calc(1-(var(--cap-p,1)-0.45)*3),1)]" data-cap-part="guides" aria-hidden="true">
                  <i className="absolute -inset-x-[50vw] top-0 border-t border-dashed border-[color-mix(in_srgb,var(--lavender-mist)_38%,transparent)]" />
                  <i className="absolute -inset-x-[50vw] bottom-0 border-t border-dashed border-[color-mix(in_srgb,var(--lavender-mist)_38%,transparent)]" />
                  <i className="absolute -top-2.5 -left-2.5 size-3.5 border-t-[1.5px] border-l-[1.5px] border-[color-mix(in_srgb,var(--cap-accent)_55%,transparent)]" />
                  <i className="absolute -top-2.5 -right-2.5 size-3.5 border-t-[1.5px] border-r-[1.5px] border-[color-mix(in_srgb,var(--cap-accent)_55%,transparent)]" />
                  <i className="absolute -bottom-2.5 -left-2.5 size-3.5 border-b-[1.5px] border-l-[1.5px] border-[color-mix(in_srgb,var(--cap-accent)_55%,transparent)]" />
                  <i className="absolute -right-2.5 -bottom-2.5 size-3.5 border-r-[1.5px] border-b-[1.5px] border-[color-mix(in_srgb,var(--cap-accent)_55%,transparent)]" />
                  <span className="absolute -top-6 left-0 font-mono text-[9px] tracking-[0.1em] text-[var(--cap-accent)] max-md:hidden">
                    960 × 600
                  </span>
                </span>

                <CapabilityPreview />
              </figure>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
