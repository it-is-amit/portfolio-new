"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { usePrefersReducedMotion } from "@/components/ui/shader-canvas-utils/motion";
import { copy, profile, services } from "@/data/profile";
import { gsap, registerGsapPlugins, revealSectionHeading } from "@/lib/gsap-client";

type DemoView = "overview" | "activity";

function DashboardOverview() {
  return (
    <div className="services-demo__overview">
      <div className="services-demo__metrics" aria-hidden="true">
        <div className="services-demo__metric"><span>Projects</span><i /><b /></div>
        <div className="services-demo__metric"><span>Activity</span><i /><b /></div>
        <div className="services-demo__metric"><span>Progress</span><i /><b /></div>
      </div>
      <div className="services-demo__chart">
        <div className="services-demo__chart-head"><span>Weekly activity</span><i /></div>
        <div className="services-demo__bars" aria-hidden="true">
          <span /><span /><span /><span /><span /><span /><span /><span />
        </div>
      </div>
    </div>
  );
}

function DashboardActivity() {
  const items = ["User flow refined", "Responsive layout", "Interface review"];
  const stages = ["Design", "Build", "Review"];

  return (
    <div className="services-demo__activity">
      {items.map((item, index) => (
        <div className="services-demo__activity-row" key={item}>
          <span className={`services-demo__activity-dot services-demo__activity-dot--${index + 1}`} />
          <span className="services-demo__activity-label">{item}</span>
          <span className="services-demo__activity-state">{stages[index]}</span>
        </div>
      ))}
    </div>
  );
}

export function ServicesSection() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const [demoView, setDemoView] = useState<DemoView>("overview");

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || reducedMotion) return;

    registerGsapPlugins();
    const context = gsap.context(() => {
      const heading = section.querySelector<HTMLElement>("#services-title");
      if (heading) revealSectionHeading(heading);
    }, section);

    return () => context.revert();
  }, [reducedMotion]);

  return (
    <section
      className="section-services relative overflow-hidden bg-[var(--surface-warm)] py-[clamp(76px,9vw,136px)] text-[var(--midnight-ink)]"
      id="what-i-do"
      ref={sectionRef}
      aria-labelledby="services-title"
    >
      <div className="mx-auto max-w-[1480px] px-[clamp(20px,5vw,84px)]">
        <header className="services-section-header">
          <div>
            <p className="font-mono text-[9px] uppercase tracking-[0.12em] text-[var(--ultra-violet)]">
              01 <span className="mx-2 text-[var(--orchid-wash)]" aria-hidden="true">/</span>{copy.services}
            </p>
            <h2 className="mt-3 text-section-heading font-semibold leading-[0.88] tracking-[-0.09em] text-[var(--midnight-ink)]" id="services-title" data-section-heading>
              {copy.servicesTitle}<span className="text-[var(--voltage-violet)]">.</span>
            </h2>
          </div>
          <p className="services-section-header__intro">{profile.about.statement}</p>
        </header>

        <div className="services-showcase">
          <div className="services-roles">
            {services.map((service, index) => (
              <article
                className={`services-role-card ${index === 0 ? "services-role-card--primary" : "services-role-card--secondary"}`}
                key={service.id}
              >
                <span className="services-role-card__number">{service.number}</span>
                <div className="services-role-card__content">
                  <h3>{service.title}</h3>
                  <ul aria-label={`${service.title} skills`}>
                    {service.skills.map((skill) => <li key={skill}>{skill}</li>)}
                  </ul>
                </div>
              </article>
            ))}
          </div>

          <div className="services-demo" id="services-demo">
            <div className="services-demo__toolbar">
              <span className="services-demo__toolbar-label">INTERACTIVE PREVIEW</span>
              <div className="services-demo__tabs" role="group" aria-label="Dashboard preview views">
                <button type="button" aria-pressed={demoView === "overview"} aria-controls="services-demo-view" onClick={() => setDemoView("overview")}>
                  Overview
                </button>
                <button type="button" aria-pressed={demoView === "activity"} aria-controls="services-demo-view" onClick={() => setDemoView("activity")}>
                  Activity
                </button>
              </div>
            </div>

            <div className="services-demo__window">
              <div className="services-demo__window-bar">
                <div className="services-demo__window-dots" aria-hidden="true"><i /><i /><i /></div>
                <span>Workspace</span>
                <span className="services-demo__window-avatar" aria-hidden="true" />
              </div>
              <div className="services-demo__window-body">
                <aside className="services-demo__sidebar" aria-hidden="true">
                  <i className="is-active" /><i /><i /><i />
                </aside>
                <div className="services-demo__content" id="services-demo-view" aria-live="polite">
                  <div className="services-demo__content-heading">
                    <span>{demoView === "overview" ? "Overview" : "Recent activity"}</span>
                    <i aria-hidden="true" />
                  </div>
                  <div className="services-demo__view" key={demoView}>
                    {demoView === "overview" ? <DashboardOverview /> : <DashboardActivity />}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
