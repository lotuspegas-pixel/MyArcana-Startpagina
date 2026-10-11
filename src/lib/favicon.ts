import { hostOf } from './util';

/**
 * Favicon resolution. Browsers block reading a site's own /favicon.ico from
 * another origin often enough that a resolver service is the only reliable
 * option; we try two and fall back to drawn initials in the UI.
 */
const PROVIDERS = [
  (host: string, size: number) =>
    `https://www.google.com/s2/favicons?domain=${encodeURIComponent(host)}&sz=${size}`,
  (host: string) => `https://icons.duckduckgo.com/ip3/${encodeURIComponent(host)}.ico`,
];

export function faviconUrl(url?: string, size = 64, provider = 0): string | null {
  const host = hostOf(url);
  if (!host) return null;
  const p = PROVIDERS[provider] ?? PROVIDERS[0];
  return p(host, size);
}

export const faviconProviderCount = PROVIDERS.length;
