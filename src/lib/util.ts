import { clsx, type ClassValue } from 'clsx';

export const cx = (...v: ClassValue[]) => clsx(v);

/** Short, collision-safe id. */
export const uid = (prefix = 'x') =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const clamp = (n: number, min: number, max: number) =>
  Math.min(max, Math.max(min, n));

/** Move an array item, returning a new array. */
export function arrayMove<T>(list: T[], from: number, to: number): T[] {
  const next = list.slice();
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

/** Accepts "example.com" as readily as a full URL. */
export function normalizeUrl(input: string): string {
  const v = input.trim();
  if (!v) return '';
  if (/^(https?|ftp|mailto|tel|chrome|edge|about|file|data):/i.test(v)) return v;
  if (v.startsWith('//')) return `https:${v}`;
  return `https://${v}`;
}

export function hostOf(url?: string): string {
  if (!url) return '';
  try {
    return new URL(normalizeUrl(url)).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
}

/** A readable title guess for a pasted URL. */
export function titleFromUrl(url: string): string {
  const host = hostOf(url);
  if (!host) return url;
  const base = host.split('.').slice(0, -1).join('.') || host;
  return base.charAt(0).toUpperCase() + base.slice(1);
}

/** Deterministic pastel from any string — used for icon-less tiles. */
export function colorFromString(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return `hsl(${h} 58% 52%)`;
}

export function initialsOf(title: string): string {
  const words = title.trim().split(/[\s._/-]+/).filter(Boolean);
  if (!words.length) return '?';
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

export function download(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function readFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result ?? ''));
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

export const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!
  );

/** Strips tags and decodes the handful of entities feeds actually emit. */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#3[0-9];/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

export function truncate(s: string, n: number) {
  return s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s;
}

/** `hsl()`/`#rrggbb` → "r g b" for use in a CSS variable. */
export function hexToRgbTriplet(hex: string): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return '109 74 255';
  return `${parseInt(m[1], 16)} ${parseInt(m[2], 16)} ${parseInt(m[3], 16)}`;
}

/** Picks black or white text for a given background, by luminance. */
export function readableOn(hex: string): string {
  const [r, g, b] = hexToRgbTriplet(hex).split(' ').map(Number);
  const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
  return lum > 0.6 ? '29 31 38' : '255 255 255';
}

export function isRtl(lang: string) {
  return ['ar', 'ur', 'fa', 'he'].includes(lang);
}
