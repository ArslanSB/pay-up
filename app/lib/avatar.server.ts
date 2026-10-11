import { createHash } from "node:crypto";

const SIZE = 256;
const MAX_BYTES = 1_000_000;
// Raster only: an SVG served from this origin could run script.
const TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);

/** Providers' avatar hosts. The URL comes from their profile response, but the server fetches it, so only these. */
export function isAvatarHost(url: URL): boolean {
  return url.protocol === "https:" && (url.hostname === "avatars.githubusercontent.com" || url.hostname.endsWith(".googleusercontent.com"));
}

/** Asks the provider for a square big enough for the profile page on a 2x screen. */
export function sizedAvatarUrl(raw: string): URL | null {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (!isAvatarHost(url)) return null;
  if (url.hostname === "avatars.githubusercontent.com") url.searchParams.set("s", String(SIZE));
  else url.pathname = url.pathname.replace(/=s\d+(-c)?$/, `=s${SIZE}-c`);
  return url;
}

/** Changes whenever the avatar address does, so the browser cache never shows someone else's or a stale picture. */
export function avatarSrc(avatarUrl: string | null): string | null {
  return avatarUrl ? `/avatar?v=${createHash("sha256").update(avatarUrl).digest("hex").slice(0, 12)}` : null;
}

/** Fetches the picture for the browser, so the provider sees this server rather than the visitor. */
export async function fetchAvatar(avatarUrl: string, fetchImpl: typeof fetch = fetch): Promise<Response | null> {
  const url = sizedAvatarUrl(avatarUrl);
  if (!url) return null;
  let upstream: Response;
  try {
    upstream = await fetchImpl(url, { signal: AbortSignal.timeout(5000) });
  } catch {
    return null;
  }
  // A redirect may only land on another provider host.
  if (upstream.url && !isAvatarHost(new URL(upstream.url))) return null;
  const type = (upstream.headers.get("Content-Type") ?? "").split(";")[0].trim().toLowerCase();
  if (upstream.status !== 200 || !TYPES.has(type)) return null;
  const body = await upstream.arrayBuffer().catch(() => null);
  if (!body || body.byteLength > MAX_BYTES) return null;
  return new Response(body, {
    headers: {
      "Content-Type": type,
      "Cache-Control": "private, max-age=86400",
      "X-Content-Type-Options": "nosniff",
      Vary: "Cookie",
    },
  });
}
