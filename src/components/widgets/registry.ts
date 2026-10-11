import {
  AlignLeft, BarChart3, Bookmark, Calculator, CalendarDays, Clock, Code2,
  Coins, Globe2, Hourglass, Image, Images, LineChart, ListTodo, Newspaper,
  Quote, Search, StickyNote, TrendingUp, CloudSun,
  type LucideIcon,
} from 'lucide-react';
import type { WidgetType } from '../../store/types';

export type WidgetCategory =
  | 'popular'
  | 'productivity'
  | 'information'
  | 'media'
  | 'finance'
  | 'layout';

export interface WidgetMeta {
  type: WidgetType;
  icon: LucideIcon;
  categories: WidgetCategory[];
  /** Widgets that look wrong with a header get one hidden by default. */
  bareByDefault?: boolean;
  /** Extra words the widget picker's search should match. */
  keywords?: string[];
}

export const WIDGETS: WidgetMeta[] = [
  { type: 'bookmarks', icon: Bookmark, categories: ['popular', 'productivity'], keywords: ['links', 'favorites', 'favorieten', 'tiles'] },
  { type: 'notes', icon: StickyNote, categories: ['popular', 'productivity'], keywords: ['memo', 'scratchpad', 'notities'] },
  { type: 'todo', icon: ListTodo, categories: ['popular', 'productivity'], keywords: ['tasks', 'checklist', 'taken'] },
  { type: 'rss', icon: Newspaper, categories: ['popular', 'information'], keywords: ['news', 'feed', 'atom', 'nieuws'] },
  { type: 'weather', icon: CloudSun, categories: ['popular', 'information'], keywords: ['forecast', 'weer', 'temperature'] },
  { type: 'clock', icon: Clock, categories: ['popular', 'information'], keywords: ['time', 'klok', 'date'] },
  { type: 'worldclock', icon: Globe2, categories: ['information'], keywords: ['timezone', 'tijdzone', 'world'] },
  { type: 'calendar', icon: CalendarDays, categories: ['popular', 'productivity'], keywords: ['month', 'agenda', 'kalender'] },
  { type: 'search', icon: Search, categories: ['popular', 'layout'], bareByDefault: true, keywords: ['google', 'zoeken'] },
  { type: 'embed', icon: Code2, categories: ['media'], keywords: ['iframe', 'youtube', 'insluiten'] },
  { type: 'image', icon: Image, categories: ['media'], keywords: ['picture', 'photo', 'afbeelding'] },
  { type: 'gallery', icon: Images, categories: ['media'], keywords: ['slideshow', 'photos', 'galerij'] },
  { type: 'countdown', icon: Hourglass, categories: ['productivity'], keywords: ['timer', 'aftellen', 'deadline'] },
  { type: 'calculator', icon: Calculator, categories: ['productivity'], keywords: ['math', 'rekenmachine', 'sum'] },
  { type: 'currency', icon: Coins, categories: ['finance'], keywords: ['exchange', 'valuta', 'forex'] },
  { type: 'stocks', icon: TrendingUp, categories: ['finance'], keywords: ['shares', 'ticker', 'aandelen'] },
  { type: 'chart', icon: BarChart3, categories: ['finance', 'information'], keywords: ['graph', 'diagram', 'bar'] },
  { type: 'heading', icon: AlignLeft, categories: ['layout'], bareByDefault: true, keywords: ['title', 'kop', 'divider'] },
  { type: 'quote', icon: Quote, categories: ['layout'], keywords: ['citaat', 'saying'] },
  { type: 'html', icon: LineChart, categories: ['layout'], keywords: ['richtext', 'html', 'tekst'] },
];

export const widgetMeta = (type: WidgetType): WidgetMeta =>
  WIDGETS.find((w) => w.type === type) ?? WIDGETS[0];

export const CATEGORY_ORDER: WidgetCategory[] = [
  'popular',
  'productivity',
  'information',
  'media',
  'finance',
  'layout',
];
