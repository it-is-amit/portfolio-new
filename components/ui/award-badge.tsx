"use client";

import { useEffect, useRef } from "react";
import type {
  HTMLAttributes,
  PointerEvent as ReactPointerEvent,
  ReactNode,
} from "react";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";

type AwardTone = "gold" | "violet";

type AwardBadgeProps = Omit<
  HTMLAttributes<HTMLElement>,
  "className" | "style" | "onPointerEnter" | "onPointerMove" | "onPointerLeave"
> & {
  children: ReactNode;
  className: string;
  tone: AwardTone;
  /** Element to render. Defaults to `article` (Journey cards); small chips can use `div`. */
  as?: "article" | "div";
  /** Tilt multiplier: 1 for cards, lower for small elements where full tilt would look exaggerated. */
  tilt?: number;
};

type PointerPosition = {
  x: number;
  y: number;
};

function resetCardStyle(card: HTMLElement) {
  card.style.setProperty("--award-pointer-x", "50%");
  card.style.setProperty("--award-pointer-y", "50%");
  card.style.setProperty("--award-tilt-x", "0deg");
  card.style.setProperty("--award-tilt-y", "0deg");
  card.style.removeProperty("--award-glare-opacity");
}

/**
 * Metallic plate: pointer-driven tilt, prismatic foil, and a moving specular glare.
 * Used by the Journey award cards and the Hero experience chip. Mouse only, so touch devices
 * keep the static plate; disabled under reduced motion.
 */
export function AwardBadge({
  children,
  className,
  tone,
  as: Element = "article",
  tilt = 1,
  ...articleProps
}: AwardBadgeProps) {
  const cardRef = useRef<HTMLElement | null>(null);
  const pendingPosition = useRef<PointerPosition | null>(null);
  const frameRef = useRef<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => () => {
    if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current);
  }, []);

  useEffect(() => {
    if (!reducedMotion) return;

    const card = cardRef.current;
    pendingPosition.current = null;
    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    if (card) resetCardStyle(card);
  }, [reducedMotion]);

  const updatePointer = (event: ReactPointerEvent<HTMLElement>) => {
    if (reducedMotion || event.pointerType !== "mouse") return;

    const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
    if (width === 0 || height === 0) return;

    const x = Math.max(0, Math.min(1, (event.clientX - left) / width));
    const y = Math.max(0, Math.min(1, (event.clientY - top) / height));
    pendingPosition.current = { x, y };

    if (frameRef.current !== null) return;

    frameRef.current = window.requestAnimationFrame(() => {
      frameRef.current = null;
      const card = cardRef.current;
      const position = pendingPosition.current;
      if (!card || !position) return;

      card.style.setProperty("--award-pointer-x", `${(position.x * 100).toFixed(1)}%`);
      card.style.setProperty("--award-pointer-y", `${(position.y * 100).toFixed(1)}%`);
      card.style.setProperty("--award-tilt-x", `${((0.5 - position.y) * 8 * tilt).toFixed(2)}deg`);
      card.style.setProperty("--award-tilt-y", `${((position.x - 0.5) * 10 * tilt).toFixed(2)}deg`);
      card.style.setProperty("--award-glare-opacity", "0.95");
      pendingPosition.current = null;
    });
  };

  const resetPointer = (event: ReactPointerEvent<HTMLElement>) => {
    const card = event.currentTarget;
    pendingPosition.current = null;

    if (frameRef.current !== null) {
      window.cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }

    resetCardStyle(card);
  };

  return (
    <Element
      {...articleProps}
      ref={(node: HTMLElement | null) => {
        cardRef.current = node;
      }}
      className={className}
      data-award-tone={tone}
      onPointerEnter={updatePointer}
      onPointerMove={updatePointer}
      onPointerLeave={resetPointer}
    >
      <span className="journey-award-card__foil" aria-hidden="true" />
      {children}
    </Element>
  );
}
