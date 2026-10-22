/**
 * Universal HTML5 fallback for sites without an upstream VOT adapter.
 *
 * An HTMLMediaElement may be backed by MediaSource / blob: or by encrypted
 * media. Those cases do not expose a transferable media URL.
 */
export function resolveHtml5MediaUrl(video: HTMLVideoElement): string | null {
  if (video.srcObject || video.mediaKeys) return null;

  const active = video.currentSrc?.trim();
  // Don't fall back to stale <source> entries if the active source is MSE.
  if (active && /^(blob:|data:|mediastream:)/i.test(active)) return null;

  const candidates = [
    active,
    video.src,
    ...Array.from(video.querySelectorAll<HTMLSourceElement>("source[src]")).map(
      (source) => source.src,
    ),
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const url = new URL(candidate, video.ownerDocument.baseURI);
      if (!["http:", "https:"].includes(url.protocol)) continue;
      if (url.username || url.password) continue;
      if (!isPublicHost(url.hostname)) continue;
      url.hash = "";
      return url.href;
    } catch {
      // Try the next candidate.
    }
  }
  return null;
}

/** Reject local/private network endpoints. This is not a DNS rebinding guard. */
function isPublicHost(host: string): boolean {
  const h = host.toLowerCase().replace(/^\[|\]$/g, "");
  if (h === "localhost" || h.endsWith(".localhost")) return false;
  if (h === "::1" || h === "::" || h.includes("%")) return false;
  if (h.includes(":")) {
    return !/^(fc|fd|fe[89ab])/i.test(h);
  }
  const octets = h.split(".");
  if (octets.length === 4 && octets.every((o) => /^\d+$/.test(o))) {
    const n = octets.map(Number);
    if (n.some((o) => o < 0 || o > 255)) return false;
    const [a, b] = n;
    if (a === 0 || a === 10 || a === 127 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
    if (a === 198 && (b === 18 || b === 19)) return false;
  }
  return true;
}

/**
 * The fallback runs after all upstream site-specific adapters.
 * Keep this distinct from VOT's existing custom/direct-link adapter.
 */
export const universalHtml5Site = {
  host: "custom" as const,
  url: "stub",
  additionalData: "universal-html5",
  rawResult: true as const,
};

export function isUniversalHtml5Site(site: {
  host: string;
  additionalData?: string;
}): boolean {
  return site.host === "custom" && site.additionalData === "universal-html5";
}
