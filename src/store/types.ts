/** Every widget kind myArcana can render. */
export type WidgetType =
  | 'bookmarks'
  | 'notes'
  | 'todo'
  | 'rss'
  | 'weather'
  | 'clock'
  | 'worldclock'
  | 'calendar'
  | 'embed'
  | 'image'
  | 'gallery'
  | 'countdown'
  | 'search'
  | 'calculator'
  | 'currency'
  | 'stocks'
  | 'chart'
  | 'heading'
  | 'quote'
  | 'html';

export type BookmarkView = 'list' | 'tiles' | 'icons' | 'compact';

export interface Bookmark {
  id: string;
  /** A folder groups the bookmarks nested under it. */
  kind: 'link' | 'folder';
  title: string;
  url?: string;
  /** Overrides the auto-resolved favicon. */
  icon?: string;
  /** Tailwind-free hex, used for the tile background when there is no icon. */
  color?: string;
  note?: string;
  tags?: string[];
  /** Folder children. Folders nest one level, like start.me. */
  children?: Bookmark[];
  collapsed?: boolean;
  addedAt: number;
  /** Bumped on every open so "most visited" can be ordered. */
  visits?: number;
  lastVisit?: number;
}

export interface TodoItem {
  id: string;
  text: string;
  done: boolean;
  createdAt: number;
  due?: string;
  priority?: 'low' | 'normal' | 'high';
}

export interface GalleryImage {
  id: string;
  url: string;
  caption?: string;
  link?: string;
}

/** Per-type widget configuration. Only the keys a type uses are ever set. */
export interface WidgetConfig {
  // bookmarks
  bookmarks?: Bookmark[];
  view?: BookmarkView;
  showFavicons?: boolean;
  columns?: number;
  openInNewTab?: boolean;
  sort?: 'manual' | 'title' | 'recent' | 'visits';
  // notes / html
  text?: string;
  // todo
  todos?: TodoItem[];
  hideCompleted?: boolean;
  // rss
  feedUrl?: string;
  feedLimit?: number;
  showImages?: boolean;
  showDates?: boolean;
  showExcerpt?: boolean;
  // weather
  place?: string;
  latitude?: number;
  longitude?: number;
  units?: 'metric' | 'imperial';
  forecastDays?: number;
  // clock / worldclock
  timeZones?: { id: string; label: string; tz: string }[];
  format24?: boolean;
  showSeconds?: boolean;
  showDate?: boolean;
  analog?: boolean;
  // calendar
  weekStart?: 0 | 1 | 6;
  showWeekNumbers?: boolean;
  // embed / image / html
  url?: string;
  height?: number;
  caption?: string;
  link?: string;
  // gallery
  images?: GalleryImage[];
  interval?: number;
  // countdown
  target?: string;
  // search
  engine?: string;
  // currency
  from?: string;
  to?: string;
  amount?: number;
  // stocks
  symbols?: string[];
  // chart
  series?: { label: string; value: number; color?: string }[];
  chartKind?: 'bar' | 'line' | 'donut';
  // heading / quote
  level?: 1 | 2 | 3;
  align?: 'start' | 'center' | 'end';
  author?: string;
}

export interface Widget {
  id: string;
  type: WidgetType;
  title: string;
  /** Accent stripe colour on the widget header (hex), or undefined for none. */
  color?: string;
  collapsed?: boolean;
  /** Hide the header entirely — used for seamless search/heading widgets. */
  bare?: boolean;
  config: WidgetConfig;
}

export interface Column {
  id: string;
  /** Flex-grow weight; columns in a row share the width by these weights. */
  width: number;
  widgets: Widget[];
}

export interface Page {
  id: string;
  title: string;
  /** Emoji or lucide icon name shown on the tab. */
  icon?: string;
  columns: Column[];
  /** Per-page background override; falls back to the global theme. */
  background?: Background;
  createdAt: number;
}

export interface Background {
  kind: 'color' | 'gradient' | 'image' | 'none';
  /** Hex for `color`, CSS gradient for `gradient`, URL for `image`. */
  value: string;
  blur?: number;
  dim?: number;
}

export type ThemeMode = 'light' | 'dark' | 'system';

export interface Settings {
  language: string;
  themeMode: ThemeMode;
  accent: string;
  background: Background;
  /** Max content width in px, or 0 for full width. */
  maxWidth: number;
  columnGap: number;
  /** Translucency of widget cards, 0.4–1. */
  widgetOpacity: number;
  fontScale: number;
  radius: number;
  showSearchBar: boolean;
  searchEngine: string;
  showClockInHeader: boolean;
  showGreeting: boolean;
  userName: string;
  openLinksInNewTab: boolean;
  showPageTabs: boolean;
  compactHeader: boolean;
  /** When false the whole page is read-only — no drag, no edit affordances. */
  editMode: boolean;
  confirmDelete: boolean;
  weatherUnits: 'metric' | 'imperial';
  format24: boolean;
  weekStart: 0 | 1 | 6;
}

export interface AppState {
  version: number;
  pages: Page[];
  activePageId: string;
  settings: Settings;
}
