"use client";

import { memo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";
import Image from "next/image";
import { ArrowRight, ArrowUpRight, CodeXml, Lock, Menu, PenTool } from "lucide-react";
import { capabilityStages } from "@/data/profile";

/*
 * A single sample website ("Lumen", a concept architecture studio) that evolves through
 * wireframe → visual design → frontend build → launch. Every stage reuses the same DOM:
 * each `Slot` stacks a wireframe skin and a designed skin in the same grid cell, and the
 * scroll timeline in ServicesSection wipes between them via the `--cap-t` custom property.
 *
 * The site is drawn on a 960 × 600 design canvas; `--u` (1/960 of the viewport's container
 * width) keeps every measurement proportional, so the mock scales like a real screenshot.
 */

type ProjectFilter = "All" | "Residential" | "Workspace";

const filters: ProjectFilter[] = ["All", "Residential", "Workspace"];

const projects = [
  { id: "atrium", title: "Atrium House", type: "Residential", year: "2025", image: "/capabilities/project-atrium.webp" },
  { id: "northlight", title: "Northlight Studio", type: "Workspace", year: "2024", image: "/capabilities/project-northlight.webp" },
  { id: "courtyard", title: "Courtyard Loft", type: "Residential", year: "2024", image: "/capabilities/project-courtyard.webp" },
] as const;

const navLinks = ["Work", "Studio", "Journal", "Contact"] as const;

type SlotProps = {
  className?: string;
  wireframe: ReactNode;
  design: ReactNode;
  children?: ReactNode;
};

function Slot({ className, wireframe, design, children }: SlotProps) {
  return (
    <div className={`cap-slot${className ? ` ${className}` : ""}`} data-cap-slot>
      <div className="cap-slot__wf">{wireframe}</div>
      <div className="cap-slot__hi">{design}</div>
      {children}
    </div>
  );
}

function Bar({ width, height, className }: { width: number; height?: number; className?: string }) {
  const style = { "--w": width, ...(height ? { "--h": height } : {}) } as CSSProperties;
  return <i className={`cap-wf-bar${className ? ` ${className}` : ""}`} style={style} />;
}

function WireBox({ label }: { label: string }) {
  return (
    <span className="cap-wf-box">
      <span className="cap-wf-box__label">{label}</span>
    </span>
  );
}

function DevOutline({ label, variant }: { label: string; variant: "nav" | "hero" | "projects" }) {
  return (
    <span className={`cap-dev-outline cap-dev-outline--${variant}`}>
      <span className="cap-dev-outline__label">{label}</span>
    </span>
  );
}

function PhonePreview() {
  return (
    <div className="cap-phone">
      <div className="cap-phone__screen">
        <div className="cap-phone__site">
          <div className="cap-phone__status"><span>9:41</span><i /></div>
          <div className="cap-phone__nav">
            <span className="cap-logo"><i className="cap-logo__mark" />Lumen</span>
            <Menu aria-hidden="true" />
          </div>
          <div className="cap-phone__media">
            <Image src="/capabilities/studio-hero.webp" alt="" fill sizes="160px" />
          </div>
          <p className="cap-phone__eyebrow">Architecture &amp; Interiors</p>
          <p className="cap-phone__title">Calm spaces, made to be <span>lived in.</span></p>
          <span className="cap-phone__cta">View projects<ArrowRight aria-hidden="true" /></span>
        </div>
      </div>
    </div>
  );
}

function CapabilityPreviewComponent() {
  const [filter, setFilter] = useState<ProjectFilter>("All");
  const stageIcons = [PenTool, PenTool, CodeXml, Lock] as const;

  return (
    <div className="cap-preview" data-cap-preview>
      <div className="cap-browser">
        <div className="cap-browser__bar">
          <span className="cap-browser__dots"><i /><i /><i /></span>
          <span className="cap-browser__address">
            {capabilityStages.map((stage, index) => {
              const Icon = stageIcons[index];
              return (
                <span className="cap-browser__label" data-stage-label={index + 1} key={stage.id}>
                  <Icon aria-hidden="true" />
                  {stage.tool}
                </span>
              );
            })}
          </span>
          <span className="cap-browser__badge">Concept</span>
        </div>

        <div className="cap-browser__viewport">
          <div className="cap-site">
            <div className="cap-grid" data-cap-region>
              {Array.from({ length: 12 }, (_, index) => <i key={index} />)}
            </div>

            {/* Navigation */}
            <header className="cap-region cap-nav" data-cap-region>
              <span className="cap-nav__rule" />
              <DevOutline label="<Navbar />" variant="nav" />
              <Slot
                className="cap-nav__logo"
                wireframe={<span className="cap-wf-row"><i className="cap-wf-dot" /><Bar width={54} height={10} /></span>}
                design={<span className="cap-logo"><i className="cap-logo__mark" />Lumen</span>}
              />
              <Slot
                className="cap-nav__links"
                wireframe={<span className="cap-wf-row cap-wf-row--links">{navLinks.map((link) => <Bar width={34} key={link} />)}</span>}
                design={
                  <span className="cap-nav__list">
                    {navLinks.map((link, index) => (
                      <span className={`cap-navlink${index === 0 ? " cap-navlink--active" : ""}`} key={link}>{link}</span>
                    ))}
                  </span>
                }
              />
              <Slot
                className="cap-nav__cta"
                wireframe={<span className="cap-wf-button cap-wf-button--sm"><Bar width={70} /></span>}
                design={<span className="cap-button cap-button--dark cap-button--sm">Start a project</span>}
              />
            </header>

            {/* Hero */}
            <section className="cap-region cap-hero" data-cap-region>
              <span className="cap-wf-label cap-wf-label--hero">Hero</span>
              <DevOutline label="<Hero />" variant="hero" />
              <div className="cap-hero__copy">
                <Slot
                  className="cap-hero__eyebrow"
                  wireframe={<Bar width={150} height={8} />}
                  design={<span className="cap-eyebrow">Architecture &amp; Interiors</span>}
                />
                <Slot
                  className="cap-hero__title"
                  wireframe={<span className="cap-wf-stack cap-wf-stack--title"><Bar width={400} height={34} /><Bar width={290} height={34} /></span>}
                  design={<p className="cap-h1">Calm spaces, made<br />to be <span>lived in.</span></p>}
                >
                  <span className="cap-select" aria-hidden="true">
                    <i /><i /><i /><i />
                    <span className="cap-select__badge">428 × 85</span>
                  </span>
                </Slot>
                <Slot
                  className="cap-hero__text"
                  wireframe={<span className="cap-wf-stack"><Bar width={330} /><Bar width={250} /></span>}
                  design={<p className="cap-body">An independent studio designing homes and workplaces with light, texture and restraint.</p>}
                />
                <Slot
                  className="cap-hero__actions"
                  wireframe={
                    <span className="cap-wf-row cap-wf-row--actions">
                      <span className="cap-wf-button"><Bar width={64} /></span>
                      <span className="cap-wf-button cap-wf-button--ghost"><Bar width={56} /></span>
                    </span>
                  }
                  design={
                    <span className="cap-hero__buttons">
                      <span className="cap-button cap-button--primary">View projects<ArrowRight aria-hidden="true" /></span>
                      <span className="cap-button cap-button--ghost">Book a visit</span>
                    </span>
                  }
                >
                  <span className="cap-component-tag">Button / Primary</span>
                </Slot>
              </div>
              <Slot
                className="cap-hero__media"
                wireframe={<WireBox label="Hero image · 16:10" />}
                design={
                  <span className="cap-media">
                    <Image src="/capabilities/studio-hero.webp" alt="" fill sizes="(min-width: 1024px) 30vw, 50vw" />
                  </span>
                }
              />
            </section>

            {/* Projects */}
            <section className="cap-region cap-projects" data-cap-region>
              <span className="cap-projects__band" />
              <span className="cap-wf-label cap-wf-label--projects">Projects · 3-up grid</span>
              <DevOutline label="<ProjectGrid />" variant="projects" />
              <div className="cap-projects__head">
                <Slot
                  className="cap-projects__title"
                  wireframe={<Bar width={150} height={14} />}
                  design={<p className="cap-h2">Selected projects <span>(03)</span></p>}
                />
                <Slot
                  className="cap-projects__filters"
                  wireframe={
                    <span className="cap-wf-row cap-wf-row--chips">
                      <span className="cap-wf-chip" style={{ "--w": 40 } as CSSProperties} />
                      <span className="cap-wf-chip" style={{ "--w": 78 } as CSSProperties} />
                      <span className="cap-wf-chip" style={{ "--w": 70 } as CSSProperties} />
                    </span>
                  }
                  design={
                    <span className="cap-filters">
                      {filters.map((item) => (
                        <button
                          className="cap-chip"
                          type="button"
                          tabIndex={-1}
                          aria-pressed={filter === item}
                          onClick={() => setFilter(item)}
                          key={item}
                        >
                          {item}
                        </button>
                      ))}
                    </span>
                  }
                />
              </div>
              <div className="cap-cards">
                {projects.map((project, index) => (
                  <div
                    className="cap-card"
                    data-dim={filter !== "All" && project.type !== filter ? "true" : undefined}
                    data-lift={index === 1 ? "true" : undefined}
                    key={project.id}
                  >
                    <Slot
                      className="cap-card__media"
                      wireframe={<WireBox label="Image" />}
                      design={
                        <span className="cap-media cap-media--card">
                          <Image src={project.image} alt="" fill sizes="(min-width: 1024px) 18vw, 30vw" />
                        </span>
                      }
                    />
                    <Slot
                      className="cap-card__title"
                      wireframe={<Bar width={128} height={10} />}
                      design={<span className="cap-card__name">{project.title}<ArrowUpRight aria-hidden="true" /></span>}
                    />
                    <Slot
                      className="cap-card__meta"
                      wireframe={<Bar width={86} height={7} />}
                      design={<span className="cap-card__info">{project.type} · {project.year}</span>}
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Design-tool annotations drawn in canvas coordinates. */}
            <svg className="cap-overlay" viewBox="0 0 960 600" preserveAspectRatio="none" aria-hidden="true">
              <g className="cap-overlay__flow">
                <path d="M97 322 C 97 362, 150 396, 232 396" />
                <path className="cap-overlay__arrowhead" d="M224 390 L 233 396 L 224 402" />
                <rect x="112" y="344" width="58" height="15" rx="3" />
                <text x="141" y="354.5">User flow</text>
              </g>
              <g className="cap-overlay__redline">
                <path d="M469 165 H 499 M469 159 V 171 M499 159 V 171" />
                <rect x="472" y="145" width="24" height="13" rx="2" />
                <text x="484" y="154.5">32</text>
              </g>
            </svg>

            <span className="cap-toast"><i />Compiled successfully<em>next dev</em></span>

            <svg className="cap-cursor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 2 L3 16 L7 12.4 L9.6 18 L12.2 16.8 L9.7 11.4 L15 11.2 Z" />
            </svg>
          </div>
        </div>
      </div>

      <PhonePreview />
    </div>
  );
}

/** Memoised: the scroll timeline drives this subtree through CSS custom properties, not props. */
export const CapabilityPreview = memo(CapabilityPreviewComponent);
