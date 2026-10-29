import type { Metadata, Viewport } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource/ibm-plex-mono/latin-400.css";
import "@fontsource/ibm-plex-mono/latin-500.css";
import "@fontsource/ibm-plex-mono/latin-600.css";
import { profile } from "@/data/profile";
import { getRequestSiteUrl } from "@/lib/site-url";
import { preloaderBootScript } from "@/lib/preloader-boot";
import "./globals.css";

const siteName = `${profile.name} | Portfolio`;

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = await getRequestSiteUrl();
  return {
    ...(metadataBase ? { metadataBase } : {}),
    title: profile.seo.title,
    description: profile.seo.description,
    applicationName: siteName,
    category: "technology",
    openGraph: {
      type: "website",
      title: profile.seo.title,
      description: profile.seo.description,
      siteName,
      images: [{
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: profile.seo.imageAlt,
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: profile.seo.title,
      description: profile.seo.description,
      images: ["/twitter-image"],
    },
    icons: {
      icon: "/icon.svg",
      shortcut: "/icon.svg",
    },
  };
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "light",
  themeColor: "#F1F5F9",
};

/**
 * Site scrollbar: a slim violet pill on the page ivory that turns lavender-on-ink over the dark
 * sections (SectionDock sets `data-scroll-tone` on <html> from the same check it uses for its glass).
 * Chromium/Safari use the ::-webkit-scrollbar parts; Firefox (no ::-webkit-scrollbar) gets
 * scrollbar-width/scrollbar-color instead, since setting those would disable the parts in Chromium.
 */
const scrollbarClassName = [
  "[&::-webkit-scrollbar]:w-[11px]",
  "[&::-webkit-scrollbar-track]:bg-[var(--surface-warm)]",
  "[&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-[3px] [&::-webkit-scrollbar-thumb]:border-solid [&::-webkit-scrollbar-thumb]:border-transparent [&::-webkit-scrollbar-thumb]:bg-clip-padding",
  "[&::-webkit-scrollbar-thumb]:bg-[linear-gradient(180deg,var(--lavender-mist),var(--voltage-violet))]",
  "[&::-webkit-scrollbar-thumb:hover]:border-2 [&::-webkit-scrollbar-thumb:hover]:bg-[linear-gradient(180deg,var(--voltage-violet),var(--ultra-violet))]",
  "data-[scroll-tone=dark]:[&::-webkit-scrollbar-track]:bg-[#13111c]",
  "data-[scroll-tone=dark]:[&::-webkit-scrollbar-thumb]:bg-[linear-gradient(180deg,var(--orchid-wash),var(--lavender-mist))]",
  "data-[scroll-tone=dark]:[&::-webkit-scrollbar-thumb:hover]:bg-[linear-gradient(180deg,#d7b9f8,var(--orchid-wash))]",
  "supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-width:thin]",
  "supports-[not_selector(::-webkit-scrollbar)]:[scrollbar-color:var(--voltage-violet)_var(--surface-warm)]",
  "supports-[not_selector(::-webkit-scrollbar)]:data-[scroll-tone=dark]:[scrollbar-color:var(--lavender-mist)_#13111c]",
].join(" ");

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    // suppressHydrationWarning: the inline preloader script sets `data-preloader` on <html> before hydration.
    <html lang="en" className={scrollbarClassName} suppressHydrationWarning>
      <head>
        {/* Runs before the first paint so the intro loader shows from the very first frame. */}
        <script dangerouslySetInnerHTML={{ __html: preloaderBootScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
