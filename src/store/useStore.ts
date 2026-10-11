import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  AppState,
  Background,
  Bookmark,
  Column,
  Page,
  Settings,
  Widget,
  WidgetType,
} from './types';
import {
  SCHEMA_VERSION,
  defaultSettings,
  makeColumn,
  makePage,
  makeWidget,
  starterPages,
} from './defaults';
import { arrayMove, clamp, uid } from '../lib/util';
import { resolveLocale } from '../lib/locales';

export const STORAGE_KEY = 'myarcana-store';
const UNDO_DEPTH = 40;

interface Actions {
  // pages
  setActivePage: (id: string) => void;
  addPage: (title: string, columnCount?: number) => string;
  updatePage: (id: string, patch: Partial<Omit<Page, 'columns'>>) => void;
  deletePage: (id: string) => void;
  duplicatePage: (id: string) => void;
  reorderPages: (from: number, to: number) => void;
  setPageBackground: (id: string, bg?: Background) => void;
  replacePages: (pages: Page[]) => void;
  // columns
  setColumnCount: (pageId: string, count: number) => void;
  addColumn: (pageId: string, at?: number) => void;
  removeColumn: (pageId: string, columnId: string) => void;
  setColumnWidth: (pageId: string, columnId: string, width: number) => void;
  reorderColumns: (pageId: string, from: number, to: number) => void;
  // widgets
  addWidget: (
    pageId: string,
    columnId: string,
    type: WidgetType,
    title: string,
    config?: Partial<Widget['config']>
  ) => string;
  updateWidget: (id: string, patch: Partial<Widget>) => void;
  patchWidgetConfig: (id: string, patch: Partial<Widget['config']>) => void;
  removeWidget: (id: string) => void;
  duplicateWidget: (id: string) => void;
  moveWidget: (widgetId: string, toColumnId: string, toIndex: number) => void;
  // bookmarks
  addBookmark: (widgetId: string, bm: Partial<Bookmark>, folderId?: string) => void;
  updateBookmark: (widgetId: string, bmId: string, patch: Partial<Bookmark>) => void;
  removeBookmark: (widgetId: string, bmId: string) => void;
  setBookmarks: (widgetId: string, list: Bookmark[]) => void;
  moveBookmark: (
    fromWidgetId: string,
    bmId: string,
    toWidgetId: string,
    toIndex: number,
    toFolderId?: string
  ) => void;
  visitBookmark: (widgetId: string, bmId: string) => void;
  // settings & data
  updateSettings: (patch: Partial<Settings>) => void;
  importState: (state: Partial<AppState>, mode: 'replace' | 'merge') => void;
  resetAll: () => void;
  // history
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export type Store = AppState & Actions;

/* ------------------------------------------------------------------ helpers */

/** Clone of the parts of state that undo restores. */
type Snapshot = Pick<AppState, 'pages' | 'activePageId' | 'settings'>;

let past: Snapshot[] = [];
let future: Snapshot[] = [];

function snapshot(s: AppState): Snapshot {
  return structuredClone({
    pages: s.pages,
    activePageId: s.activePageId,
    settings: s.settings,
  });
}

/**
 * Wraps a state producer so the pre-change state lands on the undo stack.
 * Settings-only tweaks pass `track: false` to keep the stack meaningful.
 */
function withHistory<T extends AppState>(
  set: (fn: (s: T) => Partial<T>) => void,
  get: () => T,
  producer: (s: T) => Partial<T>,
  track = true
) {
  if (track) {
    past = [...past.slice(-(UNDO_DEPTH - 1)), snapshot(get())];
    future = [];
  }
  set(producer);
}

const mapPages = (pages: Page[], id: string, fn: (p: Page) => Page) =>
  pages.map((p) => (p.id === id ? fn(p) : p));

/** Applies `fn` to the column that holds `widgetId`, across all pages. */
function mapWidget(pages: Page[], widgetId: string, fn: (w: Widget) => Widget): Page[] {
  return pages.map((p) => ({
    ...p,
    columns: p.columns.map((c) =>
      c.widgets.some((w) => w.id === widgetId)
        ? { ...c, widgets: c.widgets.map((w) => (w.id === widgetId ? fn(w) : w)) }
        : c
    ),
  }));
}

/** Depth-first update of one bookmark anywhere in a (folder) tree. */
function mapBookmarkTree(
  list: Bookmark[],
  id: string,
  fn: (b: Bookmark) => Bookmark | null
): Bookmark[] {
  const out: Bookmark[] = [];
  for (const b of list) {
    if (b.id === id) {
      const next = fn(b);
      if (next) out.push(next);
      continue;
    }
    out.push(b.children ? { ...b, children: mapBookmarkTree(b.children, id, fn) } : b);
  }
  return out;
}

function findBookmark(list: Bookmark[], id: string): Bookmark | undefined {
  for (const b of list) {
    if (b.id === id) return b;
    if (b.children) {
      const hit = findBookmark(b.children, id);
      if (hit) return hit;
    }
  }
  return undefined;
}

/** Inserts into the root list or into a folder's children. */
function insertBookmark(
  list: Bookmark[],
  bm: Bookmark,
  index: number,
  folderId?: string
): Bookmark[] {
  if (!folderId) {
    const next = list.slice();
    next.splice(index < 0 ? next.length : index, 0, bm);
    return next;
  }
  return list.map((b) => {
    if (b.id !== folderId) {
      return b.children ? { ...b, children: insertBookmark(b.children, bm, index, folderId) } : b;
    }
    const kids = (b.children ?? []).slice();
    kids.splice(index < 0 ? kids.length : index, 0, bm);
    return { ...b, children: kids };
  });
}

function freshState(): AppState {
  const language = resolveLocale(navigator.languages ?? [navigator.language]);
  return {
    version: SCHEMA_VERSION,
    pages: [],
    activePageId: '',
    settings: defaultSettings(language),
  };
}

/* -------------------------------------------------------------------- store */

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...freshState(),

      /* pages ------------------------------------------------------------ */
      setActivePage: (id) => set({ activePageId: id }),

      addPage: (title, columnCount = 3) => {
        const page = makePage(
          title,
          Array.from({ length: clamp(columnCount, 1, 7) }, () => makeColumn()),
          '📄'
        );
        withHistory(set, get, (s) => ({
          pages: [...s.pages, page],
          activePageId: page.id,
        }));
        return page.id;
      },

      updatePage: (id, patch) =>
        withHistory(set, get, (s) => ({
          pages: mapPages(s.pages, id, (p) => ({ ...p, ...patch })),
        })),

      deletePage: (id) =>
        withHistory(set, get, (s) => {
          if (s.pages.length <= 1) return {};
          const idx = s.pages.findIndex((p) => p.id === id);
          const pages = s.pages.filter((p) => p.id !== id);
          const activePageId =
            s.activePageId === id
              ? pages[Math.min(idx, pages.length - 1)].id
              : s.activePageId;
          return { pages, activePageId };
        }),

      duplicatePage: (id) =>
        withHistory(set, get, (s) => {
          const src = s.pages.find((p) => p.id === id);
          if (!src) return {};
          // Deep clone with fresh ids so the copy is fully independent.
          const clone: Page = structuredClone(src);
          clone.id = uid('pg');
          clone.title = `${src.title} (2)`;
          clone.createdAt = Date.now();
          const reid = (list: Bookmark[]): Bookmark[] =>
            list.map((b) => ({
              ...b,
              id: uid(b.kind === 'folder' ? 'fd' : 'bm'),
              children: b.children ? reid(b.children) : undefined,
            }));
          clone.columns = clone.columns.map((c) => ({
            ...c,
            id: uid('col'),
            widgets: c.widgets.map((w) => ({
              ...w,
              id: uid('w'),
              config: w.config.bookmarks
                ? { ...w.config, bookmarks: reid(w.config.bookmarks) }
                : w.config,
            })),
          }));
          const idx = s.pages.findIndex((p) => p.id === id);
          const pages = s.pages.slice();
          pages.splice(idx + 1, 0, clone);
          return { pages, activePageId: clone.id };
        }),

      reorderPages: (from, to) =>
        withHistory(set, get, (s) => ({ pages: arrayMove(s.pages, from, to) })),

      setPageBackground: (id, bg) =>
        withHistory(set, get, (s) => ({
          pages: mapPages(s.pages, id, (p) => ({ ...p, background: bg })),
        })),

      replacePages: (pages) =>
        withHistory(set, get, (s) => ({
          pages,
          activePageId: pages.some((p) => p.id === s.activePageId)
            ? s.activePageId
            : (pages[0]?.id ?? ''),
        })),

      /* columns ---------------------------------------------------------- */
      setColumnCount: (pageId, count) =>
        withHistory(set, get, (s) => ({
          pages: mapPages(s.pages, pageId, (p) => {
            const target = clamp(count, 1, 7);
            if (target === p.columns.length) return p;
            if (target > p.columns.length) {
              const add = Array.from({ length: target - p.columns.length }, () => makeColumn());
              return { ...p, columns: [...p.columns, ...add] };
            }
            // Shrinking: never drop widgets — fold the tail into the last kept column.
            const keep = p.columns.slice(0, target);
            const dropped = p.columns.slice(target).flatMap((c) => c.widgets);
            const columns = keep.map((c, i) =>
              i === target - 1 ? { ...c, widgets: [...c.widgets, ...dropped] } : c
            );
            return { ...p, columns };
          }),
        })),

      addColumn: (pageId, at) =>
        withHistory(set, get, (s) => ({
          pages: mapPages(s.pages, pageId, (p) => {
            if (p.columns.length >= 7) return p;
            const columns = p.columns.slice();
            columns.splice(at ?? columns.length, 0, makeColumn());
            return { ...p, columns };
          }),
        })),

      removeColumn: (pageId, columnId) =>
        withHistory(set, get, (s) => ({
          pages: mapPages(s.pages, pageId, (p) => {
            if (p.columns.length <= 1) return p;
            const idx = p.columns.findIndex((c) => c.id === columnId);
            if (idx < 0) return p;
            const dropped = p.columns[idx].widgets;
            const columns = p.columns.filter((c) => c.id !== columnId);
            const into = Math.max(0, idx - 1);
            columns[into] = { ...columns[into], widgets: [...columns[into].widgets, ...dropped] };
            return { ...p, columns };
          }),
        })),

      setColumnWidth: (pageId, columnId, width) =>
        withHistory(set, get, (s) => ({
          pages: mapPages(s.pages, pageId, (p) => ({
            ...p,
            columns: p.columns.map((c) =>
              c.id === columnId ? { ...c, width: clamp(width, 0.4, 3) } : c
            ),
          })),
        })),

      reorderColumns: (pageId, from, to) =>
        withHistory(set, get, (s) => ({
          pages: mapPages(s.pages, pageId, (p) => ({
            ...p,
            columns: arrayMove(p.columns, from, to),
          })),
        })),

      /* widgets ---------------------------------------------------------- */
      addWidget: (pageId, columnId, type, title, config) => {
        const widget = makeWidget(type, title, config);
        withHistory(set, get, (s) => ({
          pages: mapPages(s.pages, pageId, (p) => ({
            ...p,
            columns: p.columns.map((c) =>
              c.id === columnId ? { ...c, widgets: [...c.widgets, widget] } : c
            ),
          })),
        }));
        return widget.id;
      },

      updateWidget: (id, patch) =>
        withHistory(set, get, (s) => ({ pages: mapWidget(s.pages, id, (w) => ({ ...w, ...patch })) })),

      patchWidgetConfig: (id, patch) =>
        withHistory(set, get, (s) => ({
          pages: mapWidget(s.pages, id, (w) => ({ ...w, config: { ...w.config, ...patch } })),
        })),

      removeWidget: (id) =>
        withHistory(set, get, (s) => ({
          pages: s.pages.map((p) => ({
            ...p,
            columns: p.columns.map((c) => ({
              ...c,
              widgets: c.widgets.filter((w) => w.id !== id),
            })),
          })),
        })),

      duplicateWidget: (id) =>
        withHistory(set, get, (s) => ({
          pages: s.pages.map((p) => ({
            ...p,
            columns: p.columns.map((c) => {
              const idx = c.widgets.findIndex((w) => w.id === id);
              if (idx < 0) return c;
              const clone: Widget = structuredClone(c.widgets[idx]);
              clone.id = uid('w');
              if (clone.config.bookmarks) {
                const reid = (list: Bookmark[]): Bookmark[] =>
                  list.map((b) => ({
                    ...b,
                    id: uid(b.kind === 'folder' ? 'fd' : 'bm'),
                    children: b.children ? reid(b.children) : undefined,
                  }));
                clone.config = { ...clone.config, bookmarks: reid(clone.config.bookmarks) };
              }
              const widgets = c.widgets.slice();
              widgets.splice(idx + 1, 0, clone);
              return { ...c, widgets };
            }),
          })),
        })),

      moveWidget: (widgetId, toColumnId, toIndex) =>
        withHistory(set, get, (s) => {
          let moved: Widget | undefined;
          // Pass 1: lift the widget out of wherever it is.
          const lifted = s.pages.map((p) => ({
            ...p,
            columns: p.columns.map((c) => {
              const hit = c.widgets.find((w) => w.id === widgetId);
              if (!hit) return c;
              moved = hit;
              return { ...c, widgets: c.widgets.filter((w) => w.id !== widgetId) };
            }),
          }));
          if (!moved) return {};
          const widget = moved;
          // Pass 2: drop it at the requested index of the target column.
          return {
            pages: lifted.map((p) => ({
              ...p,
              columns: p.columns.map((c) => {
                if (c.id !== toColumnId) return c;
                const widgets = c.widgets.slice();
                widgets.splice(toIndex < 0 ? widgets.length : toIndex, 0, widget);
                return { ...c, widgets };
              }),
            })),
          };
        }),

      /* bookmarks -------------------------------------------------------- */
      addBookmark: (widgetId, bm, folderId) =>
        withHistory(set, get, (s) => ({
          pages: mapWidget(s.pages, widgetId, (w) => {
            const entry: Bookmark = {
              id: uid(bm.kind === 'folder' ? 'fd' : 'bm'),
              kind: bm.kind ?? 'link',
              title: bm.title ?? '',
              url: bm.url,
              icon: bm.icon,
              color: bm.color,
              note: bm.note,
              children: bm.kind === 'folder' ? (bm.children ?? []) : undefined,
              addedAt: Date.now(),
            };
            return {
              ...w,
              config: {
                ...w.config,
                bookmarks: insertBookmark(w.config.bookmarks ?? [], entry, -1, folderId),
              },
            };
          }),
        })),

      updateBookmark: (widgetId, bmId, patch) =>
        withHistory(set, get, (s) => ({
          pages: mapWidget(s.pages, widgetId, (w) => ({
            ...w,
            config: {
              ...w.config,
              bookmarks: mapBookmarkTree(w.config.bookmarks ?? [], bmId, (b) => ({ ...b, ...patch })),
            },
          })),
        })),

      removeBookmark: (widgetId, bmId) =>
        withHistory(set, get, (s) => ({
          pages: mapWidget(s.pages, widgetId, (w) => ({
            ...w,
            config: {
              ...w.config,
              bookmarks: mapBookmarkTree(w.config.bookmarks ?? [], bmId, () => null),
            },
          })),
        })),

      setBookmarks: (widgetId, list) =>
        withHistory(set, get, (s) => ({
          pages: mapWidget(s.pages, widgetId, (w) => ({
            ...w,
            config: { ...w.config, bookmarks: list },
          })),
        })),

      moveBookmark: (fromWidgetId, bmId, toWidgetId, toIndex, toFolderId) =>
        withHistory(set, get, (s) => {
          const source = s.pages
            .flatMap((p) => p.columns)
            .flatMap((c) => c.widgets)
            .find((w) => w.id === fromWidgetId);
          const bm = source && findBookmark(source.config.bookmarks ?? [], bmId);
          if (!bm) return {};
          // A folder may not be dropped inside itself or its own subtree.
          if (bm.kind === 'folder' && toFolderId && findBookmark([bm], toFolderId)) return {};
          const lifted = mapWidget(s.pages, fromWidgetId, (w) => ({
            ...w,
            config: {
              ...w.config,
              bookmarks: mapBookmarkTree(w.config.bookmarks ?? [], bmId, () => null),
            },
          }));
          return {
            pages: mapWidget(lifted, toWidgetId, (w) => ({
              ...w,
              config: {
                ...w.config,
                bookmarks: insertBookmark(w.config.bookmarks ?? [], bm, toIndex, toFolderId),
              },
            })),
          };
        }),

      visitBookmark: (widgetId, bmId) =>
        // Visit counters are noise in the undo stack.
        withHistory(
          set,
          get,
          (s) => ({
            pages: mapWidget(s.pages, widgetId, (w) => ({
              ...w,
              config: {
                ...w.config,
                bookmarks: mapBookmarkTree(w.config.bookmarks ?? [], bmId, (b) => ({
                  ...b,
                  visits: (b.visits ?? 0) + 1,
                  lastVisit: Date.now(),
                })),
              },
            })),
          }),
          false
        ),

      /* settings & data -------------------------------------------------- */
      updateSettings: (patch) =>
        withHistory(set, get, (s) => ({ settings: { ...s.settings, ...patch } }), false),

      importState: (incoming, mode) =>
        withHistory(set, get, (s) => {
          const pages = (incoming.pages ?? []).filter(
            (p): p is Page => !!p && Array.isArray((p as Page).columns)
          );
          if (!pages.length && mode === 'replace') return {};
          if (mode === 'merge') {
            // Re-id so a merged backup can never collide with live pages.
            const renumbered = pages.map((p) => ({ ...p, id: uid('pg') }));
            return { pages: [...s.pages, ...renumbered] };
          }
          return {
            pages,
            activePageId: pages[0]?.id ?? '',
            settings: incoming.settings ? { ...s.settings, ...incoming.settings } : s.settings,
          };
        }),

      resetAll: () =>
        withHistory(set, get, (s) => ({
          ...freshState(),
          settings: defaultSettings(s.settings.language),
        })),

      /* history ---------------------------------------------------------- */
      undo: () => {
        const prev = past.pop();
        if (!prev) return;
        future = [snapshot(get()), ...future.slice(0, UNDO_DEPTH - 1)];
        set(prev);
      },
      redo: () => {
        const [next, ...rest] = future;
        if (!next) return;
        future = rest;
        past = [...past.slice(-(UNDO_DEPTH - 1)), snapshot(get())];
        set(next);
      },
      canUndo: () => past.length > 0,
      canRedo: () => future.length > 0,
    }),
    {
      name: STORAGE_KEY,
      version: SCHEMA_VERSION,
      migrate: (persisted, from) => {
        const state = persisted as Partial<AppState> | undefined;
        // v1 stored a fixed light page background, which stayed light after
        // switching to the dark theme. Hand those visitors the themed one.
        if (state?.settings && from < 2) {
          const bg = state.settings.background;
          if (bg?.kind === 'color' && bg.value?.toLowerCase() === '#f4f5f7') {
            state.settings.background = { kind: 'none', value: '', blur: 0, dim: 0 };
          }
        }
        return state as AppState;
      },
      partialize: (s) => ({
        version: s.version,
        pages: s.pages,
        activePageId: s.activePageId,
        settings: s.settings,
      }),
    }
  )
);

/** Seeds the starter pages on first run, once translations are loaded. */
export function ensureSeeded(t: (k: string) => string) {
  const s = useStore.getState();
  if (s.pages.length) return;
  const pages = starterPages(t);
  useStore.setState({ pages, activePageId: pages[0].id, version: SCHEMA_VERSION });
  past = [];
  future = [];
}

/* ----------------------------------------------------------------- selectors */

export const useActivePage = (): Page | undefined =>
  useStore((s) => s.pages.find((p) => p.id === s.activePageId) ?? s.pages[0]);

export const useSettings = () => useStore((s) => s.settings);

export function findWidget(pages: Page[], id: string): Widget | undefined {
  for (const p of pages) {
    for (const c of p.columns) {
      const w = c.widgets.find((x) => x.id === id);
      if (w) return w;
    }
  }
  return undefined;
}

export function columnOfWidget(pages: Page[], widgetId: string): Column | undefined {
  for (const p of pages) {
    for (const c of p.columns) if (c.widgets.some((w) => w.id === widgetId)) return c;
  }
  return undefined;
}

export { findBookmark };
