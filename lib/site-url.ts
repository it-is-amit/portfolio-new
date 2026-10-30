import { headers } from "next/headers";

function getPublicSiteUrl(): URL | undefined {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  const deploymentHost = process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
  const value = configured || deploymentHost;
  if (!value) return undefined;

  try {
    const url = new URL(value.startsWith("http") ? value : `https://${value}`);
    return new URL(url.origin);
  } catch {
    return undefined;
  }
}

export async function getRequestSiteUrl(): Promise<URL | undefined> {
  const configured = getPublicSiteUrl();
  if (configured) return configured;

  const requestHeaders = await headers();
  const host = (requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "")
    .split(",")[0]
    .trim();
  if (!host) return undefined;

  const forwardedProtocol = requestHeaders.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host.startsWith("localhost")
      ? "http"
      : "https";
  try {
    return new URL(`${protocol}://${host}`);
  } catch {
    return undefined;
  }
}
