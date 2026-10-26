export const profile = {
  name: "Amit Verma",
  displayName: "AMIT VERMA",
  title: "Senior Frontend Developer",
  phone: "+91 78916 72932",
  avatar: "https://media.licdn.com/dms/image/v2/D5603AQHkQ_1csElxbg/profile-displayphoto-crop_800_800/B56aFFzbtlHQAI-/0/1792172476100?e=1794441600&v=beta&t=XL4yICAd8t95Vr_PTmDKX3JOT_2mbDBhgHJ8o5peD9Y",
  location: "Kota, India",
  email: "amverma1204t@gmail.com",
  experienceYears: 5,
  userScale: "5K–50K+",
  techSummary: "React / Next.js / TypeScript",
  seo: {
    title: "Amit Verma — Senior Frontend Developer",
    description:
      "Senior frontend developer with 5 years of experience building dashboards, platforms, and websites for products used by 5K to 50K+ people.",
    imageAlt: "Amit Verma — Senior Frontend Developer (React, Next.js, TypeScript)",
  },
  links: {
    instagram: "https://www.instagram.com/it_is_amit",
    linkedin: "https://www.linkedin.com/in/amit-verma-2a46971b4/",
    github: "https://github.com/it-is-amit",
    phone: "tel:+917891672932",
    resume: "https://ik.imagekit.io/g947cuvcp/Amit_Verma_Frontend_Developer.pdf",
  },
  hero: {
    headline: ["Senior", "Frontend Developer"],
    roleLabel: "Senior Frontend Developer",
    portfolioLabel: "PORTFOLIO 2026",
    tagline: "Amit Verma’s portfolio — polished React and Next.js experiences, built to perform.",
    intro: "Senior Frontend Developer · React, Next.js, TypeScript.",
    scrollBadge: "SCROLL TO EXPLORE",
    marquee: "REACT · NEXT.JS · TYPESCRIPT · SEO · PERFORMANCE · UI/UX ·",
  },
  about: {
    statement: "I design the experience, then build it.",
    supporting:
      "I started as a UI/UX designer, then moved into frontend development. That design background is why my interfaces feel polished, and why I can work closely with designers and backend teams.",
  },
  roleInterest:
    "Open to senior frontend and React / Next.js roles at product companies across India and remote.",
  copyright: "© 2026 Amit Verma",
} as const;

export const copy = {
  skipToContent: "Skip to main content",
  siteFooter: "Site footer",
  journeyIntro: "I started in UI/UX design, which shapes how I build interfaces today.",
  journey: "Journey",
  scroll: "Scroll to explore",
  backToTop: "Back to top",
  preloaderLabel: "Senior Frontend Developer · UI/UX Designer",
  /** Capabilities heading, in two parts: the second renders in the accent colour. */
  servicesTitleLead: "Designing Experiences.",
  servicesTitleAccent: "Engineering Products.",
  /** One line: kept short enough to never wrap (see .cap-head__subtitle). */
  servicesSubtitle: "From UX design to production-ready React and Next.js.",
  contact: "Contact",
  journeyCaption: "From designer to frontend developer",
  journeyTitle: "Journey",
  journeyEducation: "Education",
  recognition: "Recognition",
  stackEyebrow: "02 / Tools & Tech",
  stackTitle: "Tools & Tech",
  downloadResume: "Download Resume",
} as const;

export const navigation = [
  { id: "hero", label: "Home", index: "00" },
  { id: "what-i-do", label: "What I Do", index: "01" },
  { id: "skills", label: "Tools & Tech", index: "02" },
  { id: "journey", label: "Journey", index: "03" },
  { id: "gallery", label: "Gallery", index: "04" },
  { id: "contact", label: "Contact", index: "05" },
] as const;

/** The four stages of the Capabilities scroll journey (sample concept product: the "Pulse" analytics dashboard). */
export const capabilityStages = [
  {
    id: "wireframe",
    tool: "Figma — Pulse / Wireframe",
  },
  {
    id: "visual-design",
    tool: "Figma — Pulse / UI",
  },
  {
    id: "frontend-build",
    tool: "localhost:3000/dashboard",
  },
  {
    id: "launch",
    tool: "pulse.app/overview",
  },
] as const;

export type CapabilityStage = 1 | 2 | 3 | 4;

export const journey = [
  {
    id: "kriscent-frontend",
    year: "2024",
    period: "Jul 2024 — Present",
    role: "Frontend Developer",
    company: "Kriscent Techno Hub, Kota",
    description:
      "Fleet, social, commerce, AI-astrology and company-site work; led frontend on key projects in a 6–8-person team.",
  },
  {
    id: "vysion-frontend",
    year: "2022",
    period: "May 2022 — May 2024",
    role: "Frontend Developer",
    company: "Vysion Technology",
    description:
      "OCEMS, Vidhya Bharti School’s site and admin, AttachClub admin, plus company and client websites.",
  },
  {
    id: "vysion-designer",
    year: "2021",
    period: "Jun 2021 — Apr 2022",
    role: "UI/UX Designer",
    company: "Vysion Technology",
    description:
      "UI/UX for Gurucamp (EdTech), Dhruvaan’s IoT app, and the Decon IoT platform.",
  },
  {
    id: "safal-intern",
    year: "2021",
    period: "Jan 2021 — May 2021",
    role: "UI/UX Design Intern",
    company: "Safal Infotech Pvt. Ltd.",
    description:
      "Wireframes, user flows, and prototypes for Market Time’s stock-market app.",
  },
] as const;

export const education = {
  qualification: "B.Tech in Computer Science and Engineering",
  institution: "IIIT Surat",
  dates: "2017 — 2021",
} as const;

export const awards = [
  { title: "Employee of the Month", organization: "Kriscent Techno Hub" },
  { title: "Most Evergreen Person of the Year", organization: "Kriscent Techno Hub" },
] as const;

export const stackGroups = [
  {
    id: "core",
    title: "Core",
    items: ["React.js", "Next.js (SSR, SSG, CSR)", "TypeScript", "JavaScript (ES6+)"] as const,
  },
  {
    id: "state-data",
    title: "State and Data",
    items: ["Redux Toolkit", "TanStack Query", "React Hook Form", "REST APIs", "Axios"] as const,
  },
  {
    id: "styling-ui",
    title: "Styling and UI",
    items: ["HTML5", "CSS3", "Tailwind CSS", "Material UI", "Shadcn UI", "Bootstrap", "Framer Motion"] as const,
  },
  {
    id: "practices",
    title: "Practices",
    items: ["SEO", "Performance Optimization", "Responsive Design", "Reusable Component Architecture"] as const,
  },
  {
    id: "backend-tools",
    title: "Backend and Tools",
    items: ["Firebase", "MongoDB", "PostgreSQL", "Git", "GitHub", "Postman", "Vercel", "Netlify", "Figma", "Adobe XD"] as const,
  },
] as const;

export type StackGroup = (typeof stackGroups)[number];
