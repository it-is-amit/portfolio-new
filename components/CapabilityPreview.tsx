"use client";

import { memo } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Bell,
  CodeXml,
  LayoutDashboard,
  LineChart,
  Lock,
  PenTool,
  Search,
  Settings,
  ShoppingBag,
  Users,
} from "lucide-react";
import { capabilityStages } from "@/data/profile";

/*
 * A concept analytics product ("Pulse") that evolves from wireframe → UI design → frontend build →
 * shipped product. Every stage reuses the same DOM: each `Slot` stacks a wireframe skin and a
 * designed skin in one grid cell, and the scroll timeline in ServicesSection wipes between them via
 * `--cap-t`. The frontend stage then wires the UI to "data": values show a loading skeleton and count
 * up (CSS integer counters driven by `--cap-n`), the chart line draws itself, and a cursor switches
 * the chart range, all scrubbed by scroll, so reversing replays it backwards.
 *
 * Drawn on a 960 × 600 canvas; `--u` (1/960 of the viewport's container width) keeps every
 * measurement proportional, so the mock scales like a real screenshot. Decorative: the figure that
 * wraps it carries the accessible description.
 *
 * Hooks read by the scroll timeline (nothing here re-renders on scroll):
 * - `data-cap-build`: wireframe build order (side → top → kpi → chart → sources → table)
 * - `data-cap-slot`: which design pass reveals the slot (type → control → visual)
 * - `data-cap-fx`: annotations and tooling that fade in/out on their own scroll interval
 */

type SlotKind = "type" | "control" | "visual";
type BuildGroup = "side" | "top" | "kpi" | "chart" | "sources" | "table";

type SlotProps = {
  className?: string;
  kind: SlotKind;
  build?: BuildGroup;
  wireframe: ReactNode;
  design: ReactNode;
  children?: ReactNode;
};

function Slot({ className, kind, build, wireframe, design, children }: SlotProps) {
  return (
    <div className={`cap-slot${className ? ` ${className}` : ""}`} data-cap-slot={kind} data-cap-build={build}>
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

function DevOutline({ label, variant }: { label: string; variant: "side" | "kpi" | "chart" | "table" }) {
  return (
    <span className={`cap-dev-outline cap-dev-outline--${variant}`} data-cap-fx={`outline-${variant}`}>
      <span className="cap-dev-outline__label">{label}</span>
    </span>
  );
}

/** Smooth (Catmull-Rom → cubic Bézier) path through evenly spaced points. */
function smoothPath(values: readonly number[], width: number) {
  const step = width / (values.length - 1);
  const points = values.map((y, index) => [index * step, y] as const);
  let d = `M${points[0][0]},${points[0][1]}`;
  for (let index = 0; index < points.length - 1; index += 1) {
    const p0 = points[index - 1] ?? points[index];
    const p1 = points[index];
    const p2 = points[index + 1];
    const p3 = points[index + 2] ?? p2;
    const c1x = p1[0] + (p2[0] - p0[0]) / 6;
    const c1y = p1[1] + (p2[1] - p0[1]) / 6;
    const c2x = p2[0] - (p3[0] - p1[0]) / 6;
    const c2y = p2[1] - (p3[1] - p1[1]) / 6;
    d += ` C${c1x.toFixed(1)},${c1y.toFixed(1)} ${c2x.toFixed(1)},${c2y.toFixed(1)} ${p2[0].toFixed(1)},${p2[1]}`;
  }
  return d;
}

const CHART_W = 438;
const CHART_H = 128;
const series30 = [104, 92, 98, 80, 86, 68, 74, 56, 62, 44, 36, 26] as const;
const series90 = [96, 104, 88, 94, 76, 82, 66, 52, 60, 46, 40, 30] as const;
const line30 = smoothPath(series30, CHART_W);
const line90 = smoothPath(series90, CHART_W);
const area = (line: string) => `${line} L${CHART_W},${CHART_H} L0,${CHART_H} Z`;

const navItems = [
  { label: "Overview", icon: LayoutDashboard },
  { label: "Analytics", icon: LineChart },
  { label: "Customers", icon: Users },
  { label: "Orders", icon: ShoppingBag },
  { label: "Settings", icon: Settings },
] as const;

/** `a` / `b`: the two counter parts each value counts up to (see .cap-count--* in globals.css). */
const kpis = [
  { id: "revenue", label: "Revenue", value: "$84.2k", a: 84, b: 2, delta: "+12.4%", down: false, spark: [18, 15, 16, 11, 12, 7, 4] },
  { id: "users", label: "Active users", value: "12.4k", a: 12, b: 4, delta: "+8.1%", down: false, spark: [16, 17, 13, 14, 10, 9, 6] },
  { id: "conversion", label: "Conversion", value: "3.8%", a: 3, b: 8, delta: "+0.6%", down: false, spark: [14, 16, 12, 13, 9, 10, 7] },
  { id: "order", label: "Avg. order", value: "$126", a: 126, b: 0, delta: "−2.3%", down: true, spark: [6, 8, 7, 11, 10, 14, 15] },
] as const;

const sources = [
  { label: "Direct", value: 42 },
  { label: "Organic search", value: 31 },
  { label: "Referral", value: 18 },
  { label: "Social", value: 9 },
] as const;

const orders = [
  { customer: "Halcyon Labs", plan: "Pro", status: "Paid", amount: "$1,240" },
  { customer: "Brightline Studio", plan: "Team", status: "Pending", amount: "$860" },
  { customer: "Oakridge Co.", plan: "Starter", status: "Paid", amount: "$320" },
] as const;

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"] as const;

function Spark({ values }: { values: readonly number[] }) {
  return (
    <svg className="cap-spark" viewBox="0 0 60 22" aria-hidden="true">
      <path d={smoothPath(values, 60)} />
    </svg>
  );
}

function PhonePreview() {
  return (
    <div className="cap-phone" data-cap-fx="phone">
      <div className="cap-phone__screen">
        <div className="cap-phone__app">
          <div className="cap-phone__status"><span>9:41</span><i /></div>
          <div className="cap-phone__head">
            <span className="cap-logo"><i className="cap-logo__mark" />Pulse</span>
            <Bell aria-hidden="true" />
          </div>
          <p className="cap-phone__title">Overview</p>
          <div className="cap-phone__kpis">
            {kpis.slice(0, 2).map((kpi) => (
              <span className="cap-phone__kpi" key={kpi.id}>
                <em>{kpi.label}</em>
                <strong>{kpi.value}</strong>
                <b>{kpi.delta}</b>
              </span>
            ))}
          </div>
          <div className="cap-phone__chart">
            <em>Revenue</em>
            <svg viewBox={`0 0 ${CHART_W} ${CHART_H}`} aria-hidden="true">
              <path className="cap-phone__area" d={area(line30)} />
              <path className="cap-phone__line" d={line30} />
            </svg>
          </div>
          <div className="cap-phone__tabs">
            {navItems.slice(0, 4).map(({ label, icon: Icon }, index) => (
              <Icon className={index === 0 ? "is-active" : undefined} aria-hidden="true" key={label} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function CapabilityPreviewComponent() {
  const stageIcons = [PenTool, PenTool, CodeXml, Lock] as const;

  return (
    <div className="cap-preview" data-cap-preview aria-hidden="true">
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
          <div className="cap-app">
            {/* Sidebar */}
            <aside className="cap-region cap-side" data-cap-region>
              <span className="cap-wf-label cap-wf-label--side" data-cap-fx="label">Navigation</span>
              <DevOutline label="<Sidebar />" variant="side" />
              <Slot
                className="cap-side__logo"
                kind="type"
                build="side"
                wireframe={<span className="cap-wf-row"><i className="cap-wf-dot" /><Bar width={58} height={11} /></span>}
                design={<span className="cap-logo"><i className="cap-logo__mark" />Pulse</span>}
              />
              <Slot
                className="cap-side__nav"
                kind="type"
                build="side"
                wireframe={
                  <span className="cap-wf-list">
                    {navItems.map((item) => (
                      <span className="cap-wf-row" key={item.label}><i className="cap-wf-square" /><Bar width={78} /></span>
                    ))}
                  </span>
                }
                design={
                  <span className="cap-nav">
                    {navItems.map(({ label, icon: Icon }, index) => (
                      <span className={`cap-nav__item${index === 0 ? " is-active" : ""}`} key={label}>
                        <Icon aria-hidden="true" />
                        {label}
                      </span>
                    ))}
                  </span>
                }
              />
              <Slot
                className="cap-side__plan"
                kind="control"
                build="side"
                wireframe={<span className="cap-wf-card"><Bar width={70} height={9} /><Bar width={110} /></span>}
                design={
                  <span className="cap-plan">
                    <strong>Pro workspace</strong>
                    <span>6 of 10 seats in use</span>
                    <i><b /></i>
                  </span>
                }
              />
            </aside>

            {/* Top bar */}
            <header className="cap-region cap-top" data-cap-region>
              <Slot
                className="cap-top__title"
                kind="type"
                build="top"
                wireframe={<span className="cap-wf-stack"><Bar width={96} height={15} /><Bar width={140} height={7} /></span>}
                design={
                  <span className="cap-top__heading">
                    <strong>Overview</strong>
                    <span>Last 30 days · updated just now</span>
                  </span>
                }
              />
              <Slot
                className="cap-top__actions"
                kind="control"
                build="top"
                wireframe={<span className="cap-wf-row"><span className="cap-wf-pill" /><i className="cap-wf-dot" /><i className="cap-wf-dot" /></span>}
                design={
                  <span className="cap-top__tools">
                    <span className="cap-search"><Search aria-hidden="true" />Search<kbd>⌘K</kbd></span>
                    <span className="cap-icon-button"><Bell aria-hidden="true" /><i /></span>
                    <span className="cap-avatar">AV</span>
                  </span>
                }
              />
            </header>

            {/* KPI cards */}
            <section className="cap-region cap-kpis" data-cap-region>
              <span className="cap-wf-label cap-wf-label--kpi" data-cap-fx="label">KPI cards × 4</span>
              <DevOutline label="<KpiCard />" variant="kpi" />
              {kpis.map((kpi, index) => (
                <div className="cap-kpi" data-cap-build="kpi" key={kpi.id}>
                  <Slot
                    className="cap-kpi__text"
                    kind="type"
                    wireframe={<span className="cap-wf-stack"><Bar width={62} height={7} /><Bar width={96} height={20} /></span>}
                    design={
                      <span className="cap-kpi__body">
                        <span className="cap-kpi__label">{kpi.label}</span>
                        <span className="cap-kpi__value">
                          <span className="cap-kpi__static">{kpi.value}</span>
                          <span
                            className={`cap-count cap-count--${kpi.id}`}
                            style={{ "--a": kpi.a, "--b": kpi.b } as CSSProperties}
                          />
                          <span className="cap-skel" />
                        </span>
                      </span>
                    }
                  />
                  <Slot
                    className="cap-kpi__meta"
                    kind="visual"
                    wireframe={<span className="cap-wf-row cap-wf-row--between"><span className="cap-wf-pill cap-wf-pill--sm" /><i className="cap-wf-spark" /></span>}
                    design={
                      <span className="cap-kpi__foot">
                        <span className={`cap-delta${kpi.down ? " cap-delta--down" : ""}`}>{kpi.delta}</span>
                        <Spark values={kpi.spark} />
                      </span>
                    }
                  />
                  {index === 0 && (
                    <>
                      <span className="cap-select" data-cap-fx="select">
                        <i /><i /><i /><i />
                        <span className="cap-select__badge">170 × 92</span>
                      </span>
                      <span className="cap-component-tag" data-cap-fx="tag">Card / KPI</span>
                    </>
                  )}
                </div>
              ))}
            </section>

            {/* Revenue chart */}
            <section className="cap-region cap-chart-card" data-cap-region data-cap-build="chart">
              <span className="cap-wf-label cap-wf-label--chart" data-cap-fx="label">Chart · 30 days</span>
              <DevOutline label="<RevenueChart range={range} />" variant="chart" />
              <div className="cap-card-head">
                <Slot
                  kind="type"
                  wireframe={<Bar width={74} height={10} />}
                  design={<span className="cap-card-title">Revenue <em>+12.4% vs last period</em></span>}
                />
                <Slot
                  kind="control"
                  wireframe={<span className="cap-wf-row cap-wf-row--tight"><span className="cap-wf-chip" /><span className="cap-wf-chip" /><span className="cap-wf-chip" /></span>}
                  design={
                    <span className="cap-segment">
                      <span>7D</span>
                      <span className="cap-segment__a">30D</span>
                      <span className="cap-segment__b">90D</span>
                    </span>
                  }
                />
              </div>
              <Slot
                className="cap-chart"
                kind="visual"
                wireframe={<WireBox label="Line chart · revenue" />}
                design={
                  <span className="cap-chart__frame">
                    <svg className="cap-chart__svg" viewBox={`0 0 ${CHART_W} ${CHART_H}`} aria-hidden="true">
                      <defs>
                        <linearGradient id="cap-chart-fill" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0" stopColor="#862fe7" stopOpacity="0.2" />
                          <stop offset="1" stopColor="#862fe7" stopOpacity="0" />
                        </linearGradient>
                      </defs>
                      {[0.25, 0.5, 0.75].map((y) => (
                        <line className="cap-chart__grid" x1="0" x2={CHART_W} y1={CHART_H * y} y2={CHART_H * y} key={y} />
                      ))}
                      <g className="cap-chart__series cap-chart__series--a">
                        <path className="cap-chart__area" d={area(line30)} />
                        <path className="cap-chart__line" d={line30} pathLength={1} />
                      </g>
                      <g className="cap-chart__series cap-chart__series--b">
                        <path className="cap-chart__area" d={area(line90)} />
                        <path className="cap-chart__line" d={line90} pathLength={1} />
                      </g>
                    </svg>
                    <span className="cap-chart__axis">{months.map((month) => <span key={month}>{month}</span>)}</span>
                    <span className="cap-skel cap-skel--chart" />
                  </span>
                }
              />
            </section>

            {/* Traffic sources */}
            <section className="cap-region cap-sources" data-cap-region data-cap-build="sources">
              <Slot
                className="cap-sources__head"
                kind="type"
                wireframe={<Bar width={92} height={10} />}
                design={<span className="cap-card-title">Traffic sources</span>}
              />
              <Slot
                className="cap-sources__list"
                kind="visual"
                wireframe={
                  <span className="cap-wf-list cap-wf-list--sources">
                    {sources.map((source) => (
                      <span className="cap-wf-stack" key={source.label}><Bar width={90} height={7} /><Bar width={196} height={4} /></span>
                    ))}
                  </span>
                }
                design={
                  <span className="cap-source-list">
                    {sources.map((source) => (
                      <span className="cap-source" style={{ "--v": source.value / 100 } as CSSProperties} key={source.label}>
                        <span className="cap-source__row"><span>{source.label}</span><strong>{source.value}%</strong></span>
                        <i><b /></i>
                      </span>
                    ))}
                  </span>
                }
              />
            </section>

            {/* Orders table */}
            <section className="cap-region cap-table" data-cap-region>
              <span className="cap-wf-label cap-wf-label--table" data-cap-fx="label">Table · recent orders</span>
              <DevOutline label="<OrdersTable />" variant="table" />
              <div className="cap-card-head" data-cap-build="table">
                <Slot kind="type" wireframe={<Bar width={98} height={10} />} design={<span className="cap-card-title">Recent orders</span>} />
                <Slot kind="control" wireframe={<Bar width={44} height={8} />} design={<span className="cap-link">View all</span>} />
              </div>
              <Slot
                className="cap-table__cols"
                kind="type"
                build="table"
                wireframe={<span className="cap-table__grid"><Bar width={60} height={6} /><Bar width={34} height={6} /><Bar width={40} height={6} /><Bar width={44} height={6} /></span>}
                design={<span className="cap-table__grid cap-table__th"><span>Customer</span><span>Plan</span><span>Status</span><span>Amount</span></span>}
              />
              {orders.map((order, index) => (
                <Slot
                  className="cap-table__row"
                  kind="type"
                  build="table"
                  wireframe={<span className="cap-table__grid"><Bar width={112} height={8} /><Bar width={40} height={8} /><span className="cap-wf-pill cap-wf-pill--sm" /><Bar width={50} height={8} /></span>}
                  design={
                    <span className={`cap-table__grid cap-table__tr${index === 1 ? " cap-table__tr--demo" : ""}`}>
                      <span className="cap-table__customer"><i>{order.customer.slice(0, 1)}</i>{order.customer}</span>
                      <span>{order.plan}</span>
                      <span><b className={`cap-status cap-status--${order.status.toLowerCase()}`}>{order.status}</b></span>
                      <span className="cap-table__amount">{order.amount}</span>
                    </span>
                  }
                  key={order.customer}
                />
              ))}
            </section>

            {/* Design-tool annotations drawn in canvas coordinates. */}
            <svg className="cap-overlay" viewBox="0 0 960 600" preserveAspectRatio="none" aria-hidden="true">
              <g className="cap-overlay__flow" data-cap-fx="flow">
                <path d="M650 238 C 650 268, 612 286, 566 290" />
                <path className="cap-overlay__arrowhead" d="M574 284 L 565 290 L 574 296" />
                <rect x="582" y="250" width="112" height="15" rx="3" />
                <text x="638" y="260.5">Filter updates chart</text>
              </g>
              <g className="cap-overlay__redline" data-cap-fx="redline">
                <path d="M382 138 H 396 M382 132 V 144 M396 132 V 144" />
                <rect x="377" y="116" width="24" height="13" rx="2" />
                <text x="389" y="125.5">14</text>
              </g>
            </svg>

            <span className="cap-toast" data-cap-fx="toast"><i />Compiled successfully<em>next dev</em></span>

            <svg className="cap-cursor" viewBox="0 0 20 20" aria-hidden="true">
              <path d="M3 2 L3 16 L7 12.4 L9.6 18 L12.2 16.8 L9.7 11.4 L15 11.2 Z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Frontend stage: the component behind the chart, as code. */}
      <div className="cap-code" data-cap-fx="code">
        <span className="cap-code__file"><CodeXml aria-hidden="true" />RevenueChart.tsx</span>
        <code><span className="cap-code__k">const</span> [range, setRange] = <span className="cap-code__f">useState</span>(<span className="cap-code__s">&quot;30d&quot;</span>);</code>
        <code><span className="cap-code__k">const</span> {"{ data }"} = <span className="cap-code__f">useMetrics</span>(range);</code>
        <code>&lt;<span className="cap-code__t">AreaChart</span> data={"{data}"} animate /&gt;</code>
      </div>

      <PhonePreview />
    </div>
  );
}

/** Memoised: the scroll timeline drives this subtree through CSS custom properties, not props. */
export const CapabilityPreview = memo(CapabilityPreviewComponent);
