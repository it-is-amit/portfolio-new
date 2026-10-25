"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "./shader-canvas-utils/cn";
import { usePrefersReducedMotion } from "./shader-canvas-utils/motion";

export type ShaderCanvasStatus = "starting" | "running" | "unsupported" | "error";

export interface ShaderCanvasProps {
  /** GLSL ES 1.0 fragment shader. The component prepends time, resolution, pointer, and colour uniforms. */
  fragment?: string;
  /** Uniform name to CSS colour. Values are re-read when the document theme changes. */
  colors?: Record<string, string>;
  /** Render scale relative to device pixels. Soft backgrounds work well below 1. */
  resolution?: number;
  /** Time in seconds for the still frame used with reduced motion. */
  stillTime?: number;
  /** Show compile or link errors over the fallback. */
  showErrors?: boolean;
  onError?: (message: string) => void;
  onStatusChange?: (status: ShaderCanvasStatus) => void;
  /** Give the canvas an accessible image label. Omit for decorative backgrounds. */
  label?: string;
  children?: ReactNode;
  /** Extra CSS classes for sizing and placement. */
  className?: string;
}

const DEFAULT_FRAGMENT = `
void main() {
  vec2 uv = gl_FragCoord.xy / u_resolution;
  vec2 p = uv * 2.0 - 1.0;
  p.x *= u_resolution.x / u_resolution.y;
  vec2 m = (u_pointer * 2.0 - 1.0) * vec2(u_resolution.x / u_resolution.y, 1.0);
  float t = u_time * 0.25;
  float wave = sin(p.x * 2.1 + t * 2.0 + sin(p.y * 3.0 - t) * 0.8) * 0.5 + 0.5;
  float glow = 0.35 / (0.35 + length(p - m) * length(p - m) * 1.6);
  float band = smoothstep(0.15, 0.95, wave * 0.7 + glow * 0.6 - uv.y * 0.35);
  vec3 colour = mix(u_surface, u_accent, band * 0.85);
  colour = mix(colour, u_ink, smoothstep(0.92, 1.0, band) * 0.12);
  gl_FragColor = vec4(colour, 1.0);
}
`;

const DEFAULT_COLORS = {
  u_accent: "var(--voltage-violet)",
  u_ink: "var(--midnight-ink)",
  u_surface: "var(--fog)",
};

const VERTEX = `
attribute vec2 a_position;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const RESERVED_UNIFORMS = new Set(["u_time", "u_resolution", "u_pointer"]);

function toRgb(
  value: string,
  host: HTMLElement,
  probe: CanvasRenderingContext2D | null,
): [number, number, number] {
  const previousColor = host.style.color;
  host.style.color = value;
  const computedColor = getComputedStyle(host).color;
  host.style.color = previousColor;

  if (probe) {
    try {
      probe.clearRect(0, 0, 1, 1);
      probe.fillStyle = computedColor;
      probe.fillRect(0, 0, 1, 1);
      const [red, green, blue] = probe.getImageData(0, 0, 1, 1).data;
      return [red! / 255, green! / 255, blue! / 255];
    } catch {
      // Older canvas implementations may not understand a computed colour string.
    }
  }

  const channels = computedColor.match(/[\d.]+/g)?.slice(0, 3).map(Number);
  if (channels?.length === 3) return channels.map((channel) => channel / 255) as [number, number, number];
  return [0.5, 0.5, 0.5];
}

function shaderLog(log: string | null): string {
  return (log ?? "").replace(/[^\x20-\x7e\n]/g, "").trim();
}

export function ShaderCanvas({
  fragment = DEFAULT_FRAGMENT,
  colors = DEFAULT_COLORS,
  resolution = 0.65,
  stillTime = 4,
  showErrors = false,
  onError,
  onStatusChange,
  label,
  children,
  className,
}: ShaderCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const callbacks = useRef({ onError, onStatusChange });
  const reducedMotion = usePrefersReducedMotion();
  const [status, setStatus] = useState<ShaderCanvasStatus>("starting");
  const [error, setError] = useState<string | null>(null);
  const colourKey = JSON.stringify(colors);

  useEffect(() => {
    callbacks.current = { onError, onStatusChange };
  }, [onError, onStatusChange]);

  useEffect(() => {
    callbacks.current.onStatusChange?.(status);
  }, [status]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let disposed = false;
    let lost = false;
    let visible = typeof IntersectionObserver === "undefined";
    let frame: number | null = null;
    let lastFrame = 0;
    let elapsed = 0;
    const pointer = { x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 };

    const updateStatus = (nextStatus: ShaderCanvasStatus) => {
      if (!disposed) setStatus(nextStatus);
    };
    const fail = (message: string) => {
      if (disposed) return;
      setError(message);
      updateStatus("error");
      callbacks.current.onError?.(message);
    };

    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext("webgl", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        premultipliedAlpha: false,
        preserveDrawingBuffer: true,
        powerPreference: "low-power",
      });
    } catch {
      gl = null;
    }

    if (!gl) {
      updateStatus("unsupported");
      return () => {
        disposed = true;
      };
    }

    const palette = JSON.parse(colourKey) as Record<string, string>;
    const names = Object.keys(palette);
    if (names.some((name) => !/^[_A-Za-z][_A-Za-z0-9]*$/.test(name) || RESERVED_UNIFORMS.has(name))) {
      fail("Colour uniform names must be valid GLSL identifiers and cannot replace built-in uniforms.");
      return () => {
        disposed = true;
      };
    }

    let vertexShader: WebGLShader | null = null;
    let fragmentShader: WebGLShader | null = null;
    let program: WebGLProgram | null = null;
    let buffer: WebGLBuffer | null = null;

    const cleanupResources = () => {
      if (buffer) gl?.deleteBuffer(buffer);
      if (program) gl?.deleteProgram(program);
      if (vertexShader) gl?.deleteShader(vertexShader);
      if (fragmentShader) gl?.deleteShader(fragmentShader);
      buffer = null;
      program = null;
      vertexShader = null;
      fragmentShader = null;
    };

    const compile = (type: number, source: string, label: string): WebGLShader | null => {
      const shader = gl?.createShader(type);
      if (!gl || !shader) {
        fail(`Could not create the ${label} shader.`);
        return null;
      }
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        const log = shaderLog(gl.getShaderInfoLog(shader));
        fail(log || `The ${label} shader did not compile.`);
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    };

    const header = [
      "precision mediump float;",
      "uniform float u_time;",
      "uniform vec2 u_resolution;",
      "uniform vec2 u_pointer;",
      ...names.map((name) => `uniform vec3 ${name};`),
    ].join("\n");

    vertexShader = compile(gl.VERTEX_SHADER, VERTEX, "vertex");
    if (vertexShader) fragmentShader = compile(gl.FRAGMENT_SHADER, `${header}\n${fragment}`, "fragment");
    if (!vertexShader || !fragmentShader) {
      cleanupResources();
      return () => {
        disposed = true;
      };
    }

    program = gl.createProgram();
    if (!program) {
      fail("Could not create the shader program.");
      cleanupResources();
      return () => {
        disposed = true;
      };
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      fail(shaderLog(gl.getProgramInfoLog(program)) || "The shader program did not link.");
      cleanupResources();
      return () => {
        disposed = true;
      };
    }

    const linkedProgram = program;
    gl.useProgram(linkedProgram);
    const bufferCreated = gl.createBuffer();
    if (!bufferCreated) {
      fail("Could not create the shader buffer.");
      cleanupResources();
      return () => {
        disposed = true;
      };
    }
    buffer = bufferCreated;
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(linkedProgram, "a_position");
    if (position < 0) {
      fail("The shader does not use the a_position attribute.");
      cleanupResources();
      return () => {
        disposed = true;
      };
    }
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const getUniform = (name: string) => gl.getUniformLocation(linkedProgram, name);
    const timeUniform = getUniform("u_time");
    const resolutionUniform = getUniform("u_resolution");
    const pointerUniform = getUniform("u_pointer");
    const colourUniforms = names.map((name) => [name, getUniform(name)] as const);
    const probeCanvas = document.createElement("canvas");
    probeCanvas.width = 1;
    probeCanvas.height = 1;
    const probe = probeCanvas.getContext("2d", { willReadFrequently: true });

    const applyColours = () => {
      for (const [name, location] of colourUniforms) {
        if (location) gl.uniform3fv(location, toRgb(palette[name]!, canvas, probe));
      }
    };

    const render = (time: number) => {
      if (disposed || lost) return;
      if (timeUniform) gl.uniform1f(timeUniform, time);
      if (resolutionUniform) gl.uniform2f(resolutionUniform, canvas.width, canvas.height);
      if (pointerUniform) gl.uniform2f(pointerUniform, pointer.x, pointer.y);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const scale = Math.max(0.1, Math.min(1, resolution)) * Math.min(1.5, window.devicePixelRatio || 1);
      const width = Math.max(1, Math.round(rect.width * scale));
      const height = Math.max(1, Math.round(rect.height * scale));
      if (canvas.width === width && canvas.height === height) return;
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    };

    const stop = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
      lastFrame = 0;
    };

    const loop = (now: number) => {
      if (disposed || lost || reducedMotion || !visible || document.hidden) {
        frame = null;
        return;
      }
      // A parent can freeze the shader (e.g. while it is blurred during the hero exit) by setting
      // data-paused="true" on the canvas: the loop keeps ticking cheaply but skips all GL work.
      if (canvas.dataset.paused === "true") {
        lastFrame = now;
        frame = window.requestAnimationFrame(loop);
        return;
      }
      if (lastFrame) elapsed += Math.min(0.1, (now - lastFrame) / 1000);
      lastFrame = now;
      pointer.x += (pointer.targetX - pointer.x) * 0.06;
      pointer.y += (pointer.targetY - pointer.y) * 0.06;
      render(elapsed);
      frame = window.requestAnimationFrame(loop);
    };

    const start = () => {
      stop();
      if (disposed || lost) return;
      if (reducedMotion) {
        render(stillTime);
        return;
      }
      if (visible && !document.hidden) frame = window.requestAnimationFrame(loop);
    };

    const resizeAndRender = () => {
      resize();
      render(reducedMotion ? stillTime : elapsed);
    };

    resize();
    applyColours();
    render(reducedMotion ? stillTime : 0);
    setError(null);
    updateStatus("running");

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(resizeAndRender);
      resizeObserver.observe(canvas);
    } else {
      window.addEventListener("resize", resizeAndRender, { passive: true });
    }

    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      intersectionObserver = new IntersectionObserver(([entry]) => {
        visible = Boolean(entry?.isIntersecting);
        if (visible) start();
        else stop();
      }, { threshold: 0.01 });
      intersectionObserver.observe(canvas);
    }

    const finePointer = typeof window.matchMedia === "function"
      && window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const onPointerMove = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      pointer.targetX = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
      pointer.targetY = Math.min(1, Math.max(0, 1 - (event.clientY - rect.top) / rect.height));
    };
    if (finePointer && !reducedMotion && "PointerEvent" in window) {
      window.addEventListener("pointermove", onPointerMove, { passive: true });
    }

    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else start();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    let themeObserver: MutationObserver | null = null;
    if (typeof MutationObserver !== "undefined") {
      themeObserver = new MutationObserver(() => {
        applyColours();
        render(reducedMotion ? stillTime : elapsed);
      });
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class", "data-theme", "style"],
      });
    }

    const onContextLost = (event: Event) => {
      event.preventDefault();
      lost = true;
      stop();
      updateStatus("unsupported");
    };
    canvas.addEventListener("webglcontextlost", onContextLost);
    start();

    return () => {
      disposed = true;
      stop();
      resizeObserver?.disconnect();
      intersectionObserver?.disconnect();
      themeObserver?.disconnect();
      if (!resizeObserver) window.removeEventListener("resize", resizeAndRender);
      if (finePointer && !reducedMotion && "PointerEvent" in window) {
        window.removeEventListener("pointermove", onPointerMove);
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      cleanupResources();
    };
  }, [colourKey, fragment, reducedMotion, resolution, stillTime]);

  const drawing = status === "running";

  return (
    <div
      className={cn(className ? undefined : "relative", "isolate overflow-hidden", className)}
      data-shader-status={status}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[radial-gradient(ellipse_at_55%_100%,var(--lavender-field)_0%,transparent_55%),linear-gradient(135deg,var(--fog),var(--pure-white))]"
        aria-hidden="true"
      />
      <canvas
        ref={canvasRef}
        role={label ? "img" : undefined}
        aria-label={label}
        aria-hidden={label ? undefined : true}
        className={cn(
          "pointer-events-none absolute inset-0 block h-full w-full rounded-[inherit]",
          !drawing && "invisible",
        )}
      />
      {showErrors && error && (
        <pre
          className="absolute inset-x-3 top-3 z-10 max-h-1/2 overflow-auto rounded-2xl border border-[var(--mist)] bg-[var(--pure-white)] p-3 font-mono text-[11px] leading-relaxed text-[var(--graphite)]"
          role="alert"
          tabIndex={0}
        >
          {error}
        </pre>
      )}
      {children && <div className="relative z-[1]">{children}</div>}
    </div>
  );
}

export default ShaderCanvas;
