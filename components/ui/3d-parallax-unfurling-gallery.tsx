"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { galleryImages } from "@/data/profile";
import { gsap, registerGsapPlugins, revealSectionHeading } from "@/lib/gsap-client";

const SLOT_COUNT = 16;
/** 16 slots; the available screenshots repeat in order until more are added to `galleryImages`. */
const SLOTS = Array.from({ length: SLOT_COUNT }, (_, index) => ({
  slot: index + 1,
  image: galleryImages[index % galleryImages.length],
  /** Repeats (and the scroll loop's duplicate columns) are decorative, so each screenshot is announced once. */
  repeat: index >= galleryImages.length,
}));

/**
 * Screenshots are SVG <image>s, not <img>: the liquid-glass dock repaints the HTML under it into a WebGL
 * canvas, and a cross-origin <img> without CORS taints that canvas (texSubImage2D SecurityError, Worker
 * DataCloneError). The glass never walks into <svg>, so these can't taint it whatever headers the CDN sends.
 * ImageKit resizes on its CDN (`tr=w-…`).
 */
const imageKitUrl = (src: string, width: number) => `${src}?tr=w-${width}`;

function GalleryImage({ slot, image, repeat, light = false, width, className = "" }: (typeof SLOTS)[number] & { light?: boolean; width: number | null; className?: string }) {
  return (
    <figure
      className={`${className} group relative m-0 aspect-video w-full shrink-0 overflow-hidden rounded-[var(--shape-radius-sm)] border transition-transform duration-300 hover:scale-[1.015] motion-reduce:transition-none motion-reduce:hover:scale-100 ${
        light ? "border-[var(--mist)] bg-[var(--fog)]" : "border-[rgba(255,255,255,0.18)] bg-[rgba(255,255,255,0.045)]"
      }`}
    >
      <svg
        className="absolute inset-0 size-full"
        {...(repeat ? { "aria-hidden": true } : { role: "img", "aria-label": `${image.alt} ${slot}` })}
      >
        {/* Requested once the gallery is about a screen away (`width` stays null until then). */}
        {width ? <image href={imageKitUrl(image.src, width)} width="100%" height="100%" preserveAspectRatio="xMidYMin slice" /> : null}
      </svg>
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(173,109,244,0.16),transparent_66%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none" aria-hidden="true" />
    </figure>
  );
}

export default function UnfurlingGallery() {
  const containerRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  // Screenshot width to request; null until the section is within one viewport of the screen.
  const [imageWidth, setImageWidth] = useState<number | null>(null);

  useEffect(() => {
    const section = containerRef.current;
    if (!section || imageWidth) return;
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      setImageWidth(window.innerWidth < 768 ? 640 : prefersReducedMotion ? 1000 : 800);
      observer.disconnect();
    }, { rootMargin: "100% 0px" });
    observer.observe(section);
    return () => observer.disconnect();
  }, [imageWidth, prefersReducedMotion]);

  useLayoutEffect(() => {
    const section = containerRef.current;
    const heading = section?.querySelector<HTMLElement>("[data-section-heading]");
    if (!section || !heading || prefersReducedMotion) return;

    registerGsapPlugins();
    const context = gsap.context(() => {
      revealSectionHeading(heading);
    }, section);

    return () => context.revert();
  }, [prefersReducedMotion]);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end end"],
  });
  const springProgress = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 22,
    mass: 0.5,
  });
  const progress = prefersReducedMotion ? scrollYProgress : springProgress;

  const columns = useMemo(() => {
    return [0, 1, 2, 3].map((columnIndex) => {
      const column = SLOTS.filter((_, index) => index % 4 === columnIndex);
      return [...column, ...column, ...column];
    });
  }, []);

  const bannerWidth = useTransform(progress, [0, 0.16], ["90vw", "100vw"]);
  const bannerHeight = useTransform(progress, [0, 0.16], ["80vh", "100vh"]);
  const bannerRadius = useTransform(progress, [0, 0.16], ["32px", "0px"]);
  const bannerBorderWidth = useTransform(progress, [0, 0.16], ["3px", "0px"]);

  const rotateY = useTransform(progress, [0.16, 1], [-42, -6]);
  const rotateX = useTransform(progress, [0.16, 1], [22, 3]);
  const rotateZ = useTransform(progress, [0.16, 1], [12, 1]);
  const translateZ = useTransform(progress, [0.16, 1], [-520, 0]);

  // Below lg the wall is taller than it is wide, so the two rising columns travel less (-24% instead
  // of -38%) and never run out before the section leaves. Laptop/desktop values are unchanged.
  const compactWallRef = useRef(false);
  useEffect(() => {
    const query = window.matchMedia("(max-width: 1023px)");
    const sync = () => { compactWallRef.current = query.matches; };
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);
  const risingColumn = (value: number) => {
    const t = Math.min(Math.max((value - 0.16) / 0.84, 0), 1);
    return `${-t * (compactWallRef.current ? 24 : 38)}%`;
  };

  const yColumn1 = useTransform(progress, risingColumn);
  const yColumn2 = useTransform(progress, [0.16, 1], ["-32%", "12%"]);
  const yColumn3 = useTransform(progress, risingColumn);
  const yColumn4 = useTransform(progress, [0.16, 1], ["-26%", "18%"]);
  const columnOffsets = [yColumn1, yColumn2, yColumn3, yColumn4];

  if (prefersReducedMotion) {
    return (
      <section className="section-gallery relative bg-[var(--surface-warm)] py-[clamp(76px,9vw,132px)]" id="gallery" ref={containerRef} aria-labelledby="gallery-title">
        <div className="mx-auto max-w-[1480px] px-[clamp(20px,5vw,84px)]">
          <header className="mb-8 max-w-[780px] sm:mb-10">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ultra-violet)]">04 <span className="mx-2 text-[var(--orchid-wash)]">/</span>Gallery</p>
            <h2 className="mt-3 text-section-heading font-semibold leading-[0.88] tracking-[-0.09em] text-[var(--midnight-ink)]" id="gallery-title" data-section-heading>Selected work<span className="text-[var(--voltage-violet)]">.</span></h2>
            <p className="mt-4 max-w-[620px] text-sm leading-relaxed text-[var(--graphite)]">Screens from projects I have designed and built.</p>
          </header>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SLOTS.map((item) => <GalleryImage key={item.slot} {...item} light width={imageWidth} />)}
          </div>
        </div>
      </section>
    );
  }

  return (
    <section
      className="section-gallery relative bg-[var(--surface-warm)] h-[400vh] md:h-[450vh] xl:h-[500vh]"
      id="gallery"
      ref={containerRef}
      aria-labelledby="gallery-title"
    >
      <div className="sticky top-0 flex h-screen supports-[height:100svh]:h-svh w-full items-center justify-center overflow-hidden">
        <motion.div
          style={{
            width: bannerWidth,
            height: bannerHeight,
            borderRadius: bannerRadius,
            borderWidth: bannerBorderWidth,
            borderColor: "rgba(95, 37, 158, 0.58)",
          }}
          className="section-gallery__stage relative mx-auto flex max-w-[1920px] items-center justify-center overflow-hidden border-solid bg-[var(--midnight-ink)] will-change-transform"
        >
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center" style={{ perspective: "1100px" }}>
            <div className="absolute inset-0 z-20 shadow-[inset_0_100px_150px_-50px_rgba(17,24,39,0.94),inset_0_-100px_150px_-50px_rgba(17,24,39,0.94),inset_120px_0_150px_-50px_rgba(17,24,39,0.72),inset_-120px_0_150px_-50px_rgba(17,24,39,0.72)]" aria-hidden="true" />
            <motion.div
              style={{
                rotateX,
                rotateY,
                rotateZ,
                z: translateZ,
                transformStyle: "preserve-3d",
              }}
              className="flex h-[150vh] w-[128vw] min-w-[1120px] origin-center items-center justify-center gap-4 opacity-100 will-change-transform md:gap-6"
            >
              {columns.map((column, columnIndex) => (
                <motion.div
                  key={`gallery-column-${columnIndex}`}
                  style={{ y: columnOffsets[columnIndex] }}
                  className="pointer-events-auto flex w-[22vw] min-w-[190px] flex-col gap-4 md:gap-6 md:max-lg:w-[30vw]"
                >
                  {column.map((item, itemIndex) => (
                    <GalleryImage
                      key={`gallery-${columnIndex}-${itemIndex}`}
                      {...item}
                      repeat={item.repeat || itemIndex >= column.length / 3}
                      // The third copy only exists to fill the taller wall on phones and tablets.
                      className={itemIndex >= (column.length / 3) * 2 ? "lg:hidden" : ""}
                      width={imageWidth}
                    />
                  ))}
                </motion.div>
              ))}
            </motion.div>
          </div>

          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-[rgba(17,24,39,0.96)] via-[rgba(17,24,39,0.66)] to-transparent px-[clamp(22px,5vw,76px)] pb-14 pt-[clamp(28px,5vh,56px)]">
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--lavender-mist)]">04 <span className="mx-2 text-[rgba(255,255,255,0.48)]">/</span>Gallery</p>
            <h2 className="mt-3 text-section-heading font-semibold leading-[0.88] tracking-[-0.09em] text-[var(--pure-white)]" id="gallery-title" data-section-heading>Selected work<span className="text-[var(--lavender-mist)]">.</span></h2>
            <p className="mt-4 max-w-[480px] font-mono text-[8px] uppercase tracking-[0.1em] text-[var(--mist)]">Scroll to explore</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
