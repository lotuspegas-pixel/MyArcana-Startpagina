import type { Background, Settings } from '../store/types';
import { hexToRgbTriplet, readableOn } from './util';

export interface AccentPreset {
  id: string;
  hex: string;
  nameKey: string;
}

export const ACCENTS: AccentPreset[] = [
  { id: 'arcana', hex: '#6d4aff', nameKey: 'color.violet' },
  { id: 'indigo', hex: '#4f46e5', nameKey: 'color.indigo' },
  { id: 'blue', hex: '#2563eb', nameKey: 'color.blue' },
  { id: 'sky', hex: '#0ea5e9', nameKey: 'color.sky' },
  { id: 'teal', hex: '#0d9488', nameKey: 'color.teal' },
  { id: 'emerald', hex: '#059669', nameKey: 'color.green' },
  { id: 'lime', hex: '#65a30d', nameKey: 'color.lime' },
  { id: 'amber', hex: '#d97706', nameKey: 'color.amber' },
  { id: 'orange', hex: '#ea580c', nameKey: 'color.orange' },
  { id: 'red', hex: '#dc2626', nameKey: 'color.red' },
  { id: 'rose', hex: '#e11d48', nameKey: 'color.rose' },
  { id: 'pink', hex: '#db2777', nameKey: 'color.pink' },
  { id: 'fuchsia', hex: '#c026d3', nameKey: 'color.fuchsia' },
  { id: 'slate', hex: '#475569', nameKey: 'color.slate' },
];

/** Widget header colours offered in the widget menu. */
export const WIDGET_COLORS = [
  '#6d4aff', '#4f46e5', '#2563eb', '#0ea5e9', '#06b6d4', '#0d9488',
  '#059669', '#65a30d', '#ca8a04', '#d97706', '#ea580c', '#dc2626',
  '#e11d48', '#db2777', '#c026d3', '#7c3aed', '#475569', '#1f2937',
];

export const GRADIENTS = [
  'linear-gradient(135deg,#667eea,#764ba2)',
  'linear-gradient(135deg,#f093fb,#f5576c)',
  'linear-gradient(135deg,#4facfe,#00f2fe)',
  'linear-gradient(135deg,#43e97b,#38f9d7)',
  'linear-gradient(135deg,#fa709a,#fee140)',
  'linear-gradient(135deg,#30cfd0,#330867)',
  'linear-gradient(135deg,#a8edea,#fed6e3)',
  'linear-gradient(135deg,#5ee7df,#b490ca)',
  'linear-gradient(135deg,#d299c2,#fef9d7)',
  'linear-gradient(135deg,#f6d365,#fda085)',
  'linear-gradient(160deg,#0f172a,#334155)',
  'linear-gradient(135deg,#232526,#414345)',
  'linear-gradient(135deg,#1a2a6c,#b21f1f,#fdbb2d)',
  'linear-gradient(135deg,#200122,#6f0000)',
  'radial-gradient(circle at 20% 20%,#2b1055,#7597de)',
  'linear-gradient(135deg,#e0c3fc,#8ec5fc)',
];

export const SOLID_BACKGROUNDS = [
  '#f4f5f7', '#eef2f7', '#e8eef6', '#eef6f1', '#f7f1e8', '#f8eef2',
  '#1f2937', '#111827', '#14151a', '#1b1f2a', '#231b2e', '#0b1120',
];

/** Curated Unsplash wallpapers; served at a size suited to a desktop backdrop. */
const unsplash = (id: string) =>
  `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=2400&q=70`;

export const WALLPAPERS: { url: string; thumb: string; credit: string }[] = [
  ['1506744038136-46273834b3fb', 'Mountain lake'],
  ['1501854140801-50d01698950b', 'Green hills'],
  ['1511884642898-4c92249e20b6', 'Snow peaks'],
  ['1470770841072-f978cf4d019e', 'Alpine cabin'],
  ['1444080748397-f442aa95c3e5', 'Dunes'],
  ['1419242902214-272b3f66ee7a', 'Forest fog'],
  ['1441974231531-c6227db76b6e', 'Sunlit trees'],
  ['1475924156734-496f6cac6ec1', 'Tropical palms'],
  ['1465101162946-4377e57745c3', 'Night sky'],
  ['1534796636912-3b95b3ab5986', 'Galaxy'],
  ['1451187580459-43490279c0fa', 'Earth from orbit'],
  ['1505322022379-7c3353ee6291', 'Aurora'],
  ['1518791841217-8f162f1e1131', 'Minimal'],
  ['1498050108023-c5249f4df085', 'Desk'],
  ['1520583457224-aee11bad5112', 'Abstract paint'],
  ['1550859492-d5da9d8e45f3', 'Gradient mesh'],
].map(([id, credit]) => ({
  url: unsplash(id),
  thumb: `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=320&q=55`,
  credit,
}));

function backgroundLayer(bg: Background): string {
  switch (bg.kind) {
    case 'color':
      return bg.value;
    case 'gradient':
      return bg.value;
    case 'image':
      return `url("${bg.value.replace(/"/g, '%22')}")`;
    default:
      return 'rgb(var(--c-surface-sunken))';
  }
}

export function resolveDark(mode: Settings['themeMode']): boolean {
  if (mode === 'dark') return true;
  if (mode === 'light') return false;
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

/** Writes the whole theme to the document root as CSS variables. */
export function applyTheme(settings: Settings, pageBackground?: Background) {
  const root = document.documentElement;
  const dark = resolveDark(settings.themeMode);
  root.dataset.theme = dark ? 'dark' : 'light';

  const accent = settings.accent || ACCENTS[0].hex;
  root.style.setProperty('--c-accent', hexToRgbTriplet(accent));
  root.style.setProperty('--c-accent-fg', readableOn(accent));

  const bg = pageBackground ?? settings.background;
  root.style.setProperty('--bg-layer', backgroundLayer(bg));
  root.style.setProperty('--bg-blur', `${bg.blur ?? 0}px`);
  root.style.setProperty('--bg-dim', String(bg.dim ?? 0));
  root.style.setProperty('--widget-alpha', String(settings.widgetOpacity));
  root.style.setProperty('--r-widget', `${settings.radius}px`);
  root.style.fontSize = `${16 * settings.fontScale}px`;

  const meta = document.querySelector('meta[name="theme-color"]:not([media])');
  if (meta) meta.setAttribute('content', dark ? '#14151a' : '#f4f5f7');
}
