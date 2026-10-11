import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Check, Database, Download, Github, Info, LayoutGrid, Palette, Settings2,
  Trash2, Upload, Wallpaper,
} from 'lucide-react';
import { Modal } from '../ui/Modal';
import { ColorSwatches, Field, InlineConfirm, SegmentedControl, Slider, Switch } from '../ui/Controls';
import { LOCALES } from '../../lib/locales';
import { ACCENTS, GRADIENTS, SOLID_BACKGROUNDS, WALLPAPERS } from '../../lib/theme';
import { SEARCH_ENGINES } from '../../lib/searchEngines';
import { countBookmarks, parseBookmarksHtml, toBookmarksHtml } from '../../lib/bookmarksFile';
import { STORAGE_KEY, useStore } from '../../store/useStore';
import { makeColumn, makePage, makeWidget } from '../../store/defaults';
import type { AppState, Background, ThemeMode } from '../../store/types';
import { setLanguage } from '../../i18n';
import { cx, download, readFile } from '../../lib/util';
import { useShallow } from 'zustand/react/shallow';

const TABS = [
  { id: 'general', icon: Settings2 },
  { id: 'appearance', icon: Palette },
  { id: 'background', icon: Wallpaper },
  { id: 'layout', icon: LayoutGrid },
  { id: 'data', icon: Database },
  { id: 'about', icon: Info },
] as const;

export type TabId = (typeof TABS)[number]['id'];

export function SettingsModal({
  open,
  initialTab,
  onClose,
}: {
  open: boolean;
  /** Which panel to land on, so menu entries can deep-link into settings. */
  initialTab?: TabId;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [tab, setTab] = useState<TabId>(initialTab ?? 'general');

  // A fresh open honours the requested panel without stranding the choice.
  useEffect(() => {
    if (open && initialTab) setTab(initialTab);
  }, [open, initialTab]);
  const {
    settings, updateSettings, pages, activePageId, importState, resetAll, replacePages,
  } = useStore(useShallow((s) => ({
    settings: s.settings,
    updateSettings: s.updateSettings,
    pages: s.pages,
    activePageId: s.activePageId,
    importState: s.importState,
    resetAll: s.resetAll,
    replacePages: s.replacePages,
  })));

  const [notice, setNotice] = useState<string | null>(null);
  const [resetting, setResetting] = useState(false);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const fileInput = useRef<HTMLInputElement>(null);

  const setBackground = (patch: Partial<Background>) =>
    updateSettings({ background: { ...settings.background, ...patch } });

  /* ------------------------------------------------------------- data I/O */

  const exportJson = () => {
    const payload: AppState = { version: 1, pages, activePageId, settings };
    download(
      `myarcana-backup-${new Date().toISOString().slice(0, 10)}.json`,
      JSON.stringify(payload, null, 2),
      'application/json'
    );
  };

  const exportHtml = () => {
    const groups = pages.flatMap((page) =>
      page.columns
        .flatMap((c) => c.widgets)
        .filter((w) => w.type === 'bookmarks' && w.config.bookmarks?.length)
        .map((w) => ({
          title: `${page.title} — ${w.title}`,
          bookmarks: w.config.bookmarks!,
        }))
    );
    download(
      `myarcana-bookmarks-${new Date().toISOString().slice(0, 10)}.html`,
      toBookmarksHtml(groups),
      'text/html'
    );
  };

  const handleFile = async (file: File) => {
    setNotice(null);
    try {
      const text = await readFile(file);

      if (/\.json$/i.test(file.name) || text.trimStart().startsWith('{')) {
        const parsed = JSON.parse(text) as Partial<AppState>;
        if (!Array.isArray(parsed.pages)) throw new Error('No pages in file');
        importState(parsed, importMode);
        setNotice(t('data.importedPages', { count: parsed.pages.length }));
        return;
      }

      // Otherwise treat it as a browser bookmark export.
      const folders = parseBookmarksHtml(text);
      if (!folders.length) throw new Error('No bookmarks found');
      const total = folders.reduce((n, f) => n + countBookmarks(f.bookmarks), 0);

      // Lay the imported folders out across three columns of one new page.
      const columns = [makeColumn(), makeColumn(), makeColumn()];
      folders.forEach((folder, i) => {
        columns[i % 3].widgets.push(
          makeWidget('bookmarks', folder.title, {
            bookmarks: folder.bookmarks,
            view: 'list',
          })
        );
      });
      const page = makePage(file.name.replace(/\.html?$/i, '') || t('data.importHtml'), columns, '🔖');
      replacePages(importMode === 'replace' ? [page] : [...pages, page]);
      setNotice(t('data.imported', { count: total }));
    } catch (err) {
      console.error(err);
      setNotice(t('data.importError'));
    }
  };

  const storageSize = (() => {
    try {
      const bytes = new Blob([localStorage.getItem(STORAGE_KEY) ?? '']).size;
      return bytes > 1024 * 1024
        ? `${(bytes / 1024 / 1024).toFixed(1)} MB`
        : `${Math.max(1, Math.round(bytes / 1024))} kB`;
    } catch {
      return '—';
    }
  })();

  return (
    <Modal open={open} onClose={onClose} size="lg" title={t('settings.title')} flush>
      <div className="flex min-h-[26rem] flex-col sm:flex-row">
        <nav
          className="no-scrollbar flex shrink-0 gap-1 overflow-x-auto border-b border-line
            p-2 sm:w-44 sm:flex-col sm:gap-0.5 sm:overflow-visible sm:border-b-0 sm:border-e"
        >
          {TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={cx(
                'flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium',
                'transition-colors',
                tab === id
                  ? 'bg-accent/10 text-accent'
                  : 'text-ink-muted hover:bg-ink/5 hover:text-ink'
              )}
            >
              <Icon size={15} />
              {t(`settings.${id}`)}
            </button>
          ))}
        </nav>

        <div className="min-w-0 flex-1 p-5">
          {tab === 'general' && (
            <>
              <Field label={t('settings.language')} hint={t('settings.languageHint')}>
                <select
                  className="field"
                  value={settings.language}
                  onChange={(e) => {
                    updateSettings({ language: e.target.value });
                    void setLanguage(e.target.value);
                  }}
                >
                  {LOCALES.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.flag} {l.native} — {l.english}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label={t('settings.yourName')} hint={t('settings.yourNameHint')}>
                <input
                  className="field"
                  value={settings.userName}
                  placeholder="—"
                  onChange={(e) => updateSettings({ userName: e.target.value })}
                />
              </Field>

              <Field label={t('settings.defaultEngine')}>
                <select
                  className="field"
                  value={settings.searchEngine}
                  onChange={(e) => updateSettings({ searchEngine: e.target.value })}
                >
                  {SEARCH_ENGINES.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="border-t border-line pt-2">
                <Switch
                  checked={settings.showGreeting}
                  onChange={(v) => updateSettings({ showGreeting: v })}
                  label={t('settings.showGreeting')}
                />
                <Switch
                  checked={settings.showSearchBar}
                  onChange={(v) => updateSettings({ showSearchBar: v })}
                  label={t('settings.showSearchBar')}
                />
                <Switch
                  checked={settings.showPageTabs}
                  onChange={(v) => updateSettings({ showPageTabs: v })}
                  label={t('settings.showPageTabs')}
                />
                <Switch
                  checked={settings.showClockInHeader}
                  onChange={(v) => updateSettings({ showClockInHeader: v })}
                  label={t('settings.showClock')}
                />
                <Switch
                  checked={settings.openLinksInNewTab}
                  onChange={(v) => updateSettings({ openLinksInNewTab: v })}
                  label={t('settings.openNewTab')}
                />
                <Switch
                  checked={settings.confirmDelete}
                  onChange={(v) => updateSettings({ confirmDelete: v })}
                  label={t('settings.confirmDelete')}
                />
                <Switch
                  checked={settings.format24}
                  onChange={(v) => updateSettings({ format24: v })}
                  label={t('settings.format24')}
                />
              </div>

              <Field label={t('settings.weekStart')} className="mt-4">
                <SegmentedControl
                  value={String(settings.weekStart) as '0' | '1' | '6'}
                  onChange={(v) => updateSettings({ weekStart: Number(v) as 0 | 1 | 6 })}
                  className="w-full"
                  options={[
                    { value: '1', label: t('weekday.1') },
                    { value: '0', label: t('weekday.0') },
                    { value: '6', label: t('weekday.6') },
                  ]}
                />
              </Field>

              <Field label={t('settings.units')}>
                <SegmentedControl
                  value={settings.weatherUnits}
                  onChange={(v) => updateSettings({ weatherUnits: v })}
                  className="w-full"
                  options={[
                    { value: 'metric', label: t('weather.metric') },
                    { value: 'imperial', label: t('weather.imperial') },
                  ]}
                />
              </Field>
            </>
          )}

          {tab === 'appearance' && (
            <>
              <Field label={t('settings.theme')}>
                <SegmentedControl
                  value={settings.themeMode}
                  onChange={(v) => updateSettings({ themeMode: v as ThemeMode })}
                  className="w-full"
                  options={[
                    { value: 'light', label: t('settings.theme.light') },
                    { value: 'dark', label: t('settings.theme.dark') },
                    { value: 'system', label: t('settings.theme.system') },
                  ]}
                />
              </Field>

              <Field label={t('settings.accent')}>
                <div className="flex flex-wrap gap-2">
                  {ACCENTS.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => updateSettings({ accent: a.hex })}
                      title={t(a.nameKey)}
                      style={{ background: a.hex }}
                      className={cx(
                        'grid h-8 w-8 place-items-center rounded-full text-white transition-transform',
                        'hover:scale-110',
                        settings.accent.toLowerCase() === a.hex.toLowerCase() &&
                          'ring-2 ring-offset-2 ring-offset-surface-raised ring-ink/50'
                      )}
                    >
                      {settings.accent.toLowerCase() === a.hex.toLowerCase() && (
                        <Check size={14} strokeWidth={3} />
                      )}
                    </button>
                  ))}
                  <label
                    className="grid h-8 w-8 cursor-pointer place-items-center rounded-full border
                      border-dashed border-line text-ink-faint hover:border-accent"
                    title={t('common.custom')}
                  >
                    +
                    <input
                      type="color"
                      className="sr-only"
                      value={settings.accent}
                      onChange={(e) => updateSettings({ accent: e.target.value })}
                    />
                  </label>
                </div>
              </Field>

              <Slider
                label={t('settings.fontScale')}
                min={0.85}
                max={1.3}
                step={0.05}
                value={settings.fontScale}
                onChange={(v) => updateSettings({ fontScale: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
              <Slider
                label={t('settings.radius')}
                min={0}
                max={22}
                value={settings.radius}
                onChange={(v) => updateSettings({ radius: v })}
                format={(v) => `${v}px`}
              />
              <Slider
                label={t('settings.widgetOpacity')}
                min={0.4}
                max={1}
                step={0.05}
                value={settings.widgetOpacity}
                onChange={(v) => updateSettings({ widgetOpacity: v })}
                format={(v) => `${Math.round(v * 100)}%`}
              />
            </>
          )}

          {tab === 'background' && (
            <>
              <Field label={t('settings.background')}>
                <SegmentedControl
                  value={settings.background.kind}
                  onChange={(kind) =>
                    setBackground({
                      kind,
                      value:
                        kind === 'color'
                          ? SOLID_BACKGROUNDS[0]
                          : kind === 'gradient'
                            ? GRADIENTS[0]
                            : kind === 'image'
                              ? WALLPAPERS[0].url
                              : '',
                    })
                  }
                  className="w-full"
                  options={[
                    { value: 'color', label: t('theme.solid') },
                    { value: 'gradient', label: t('theme.gradient') },
                    { value: 'image', label: t('theme.image') },
                    { value: 'none', label: t('theme.noBackground') },
                  ]}
                />
              </Field>

              {settings.background.kind === 'color' && (
                <ColorSwatches
                  colors={SOLID_BACKGROUNDS}
                  value={settings.background.value}
                  onChange={(value) => value && setBackground({ value })}
                />
              )}

              {settings.background.kind === 'gradient' && (
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {GRADIENTS.map((g) => (
                    <button
                      key={g}
                      onClick={() => setBackground({ value: g })}
                      style={{ background: g }}
                      className={cx(
                        'h-12 rounded-md transition-transform hover:scale-105',
                        settings.background.value === g &&
                          'ring-2 ring-offset-2 ring-offset-surface-raised ring-accent'
                      )}
                    />
                  ))}
                </div>
              )}

              {settings.background.kind === 'image' && (
                <>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {WALLPAPERS.map((w) => (
                      <button
                        key={w.url}
                        onClick={() => setBackground({ value: w.url })}
                        title={w.credit}
                        className={cx(
                          'overflow-hidden rounded-md transition-transform hover:scale-105',
                          settings.background.value === w.url &&
                            'ring-2 ring-offset-2 ring-offset-surface-raised ring-accent'
                        )}
                      >
                        <img
                          src={w.thumb}
                          alt={w.credit}
                          loading="lazy"
                          className="h-14 w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                  <Field label={t('theme.customImage')} className="mt-4">
                    <input
                      className="field"
                      value={settings.background.value}
                      placeholder="https://…"
                      onChange={(e) => setBackground({ value: e.target.value.trim() })}
                    />
                  </Field>
                </>
              )}

              {settings.background.kind !== 'none' && (
                <div className="mt-4 border-t border-line pt-4">
                  <Slider
                    label={t('theme.blur')}
                    min={0}
                    max={24}
                    value={settings.background.blur ?? 0}
                    onChange={(blur) => setBackground({ blur })}
                    format={(v) => `${v}px`}
                  />
                  <Slider
                    label={t('theme.dim')}
                    min={0}
                    max={0.75}
                    step={0.05}
                    value={settings.background.dim ?? 0}
                    onChange={(dim) => setBackground({ dim })}
                    format={(v) => `${Math.round(v * 100)}%`}
                  />
                </div>
              )}
            </>
          )}

          {tab === 'layout' && (
            <>
              <Field label={t('settings.maxWidth')}>
                <SegmentedControl
                  value={settings.maxWidth === 0 ? 'full' : String(settings.maxWidth)}
                  onChange={(v) =>
                    updateSettings({ maxWidth: v === 'full' ? 0 : Number(v) })
                  }
                  className="w-full"
                  options={[
                    { value: '1200', label: '1200' },
                    { value: '1600', label: '1600' },
                    { value: '2000', label: '2000' },
                    { value: 'full', label: t('settings.fullWidth') },
                  ]}
                />
              </Field>
              <Slider
                label={t('settings.columnGap')}
                min={4}
                max={36}
                step={2}
                value={settings.columnGap}
                onChange={(v) => updateSettings({ columnGap: v })}
                format={(v) => `${v}px`}
              />
              <Switch
                checked={settings.compactHeader}
                onChange={(v) => updateSettings({ compactHeader: v })}
                label={t('settings.compactHeader')}
              />
            </>
          )}

          {tab === 'data' && (
            <>
              <h3 className="label">{t('data.export')}</h3>
              <div className="mb-5 space-y-2">
                <button className="btn-outline w-full justify-start" onClick={exportJson}>
                  <Download size={15} />
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block">{t('data.exportJson')}</span>
                    <span className="block text-2xs font-normal text-ink-faint">
                      {t('data.exportJsonHint')}
                    </span>
                  </span>
                </button>
                <button className="btn-outline w-full justify-start" onClick={exportHtml}>
                  <Download size={15} />
                  <span className="min-w-0 flex-1 text-start">
                    <span className="block">{t('data.exportHtml')}</span>
                    <span className="block text-2xs font-normal text-ink-faint">
                      {t('data.exportHtmlHint')}
                    </span>
                  </span>
                </button>
              </div>

              <h3 className="label">{t('data.import')}</h3>
              <SegmentedControl
                value={importMode}
                onChange={setImportMode}
                className="mb-2 w-full"
                options={[
                  { value: 'merge', label: t('data.importMerge') },
                  { value: 'replace', label: t('data.importReplace') },
                ]}
              />
              <button
                className="btn-outline w-full justify-start"
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={15} />
                <span className="min-w-0 flex-1 text-start">
                  <span className="block">{t('data.importFile')}</span>
                  <span className="block text-2xs font-normal text-ink-faint">
                    {t('data.importJson')} · {t('data.importHtml')}
                  </span>
                </span>
              </button>
              <input
                ref={fileInput}
                type="file"
                accept=".json,.html,.htm,application/json,text/html"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void handleFile(file);
                  e.target.value = '';
                }}
              />
              <p className="mt-1.5 text-xs text-ink-faint">{t('data.importHint')}</p>

              {notice && (
                <p className="mt-3 rounded-md bg-accent/10 px-3 py-2 text-sm text-ink">
                  {notice}
                </p>
              )}

              <div className="mt-6 border-t border-line pt-4">
                <p className="text-xs text-ink-muted">
                  {t('data.storage', { size: storageSize })}
                </p>
                <p className="mt-1 text-xs text-ink-faint">{t('data.storageHint')}</p>

                {resetting ? (
                  <div className="mt-3">
                    <InlineConfirm
                      message={t('data.resetConfirm')}
                      confirmLabel={t('data.reset')}
                      cancelLabel={t('common.cancel')}
                      onConfirm={() => {
                        resetAll();
                        setResetting(false);
                        onClose();
                        location.reload();
                      }}
                      onCancel={() => setResetting(false)}
                    />
                  </div>
                ) : (
                  <button
                    className="btn mt-3 px-3 py-2 text-sm text-red-600 hover:bg-red-500/10"
                    onClick={() => setResetting(true)}
                  >
                    <Trash2 size={15} /> {t('data.reset')}
                  </button>
                )}
              </div>
            </>
          )}

          {tab === 'about' && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <img src="./favicon.svg" alt="" className="h-11 w-11 rounded-xl" />
                <div>
                  <p className="text-base font-semibold text-ink">myArcana</p>
                  <p className="text-xs text-ink-faint">
                    {t('about.version', { version: '1.0.0' })}
                  </p>
                </div>
              </div>
              <p className="text-sm leading-relaxed text-ink-muted">{t('about.body')}</p>
              <p className="text-sm text-ink-muted">
                {t('settings.languageHint')}{' '}
                {LOCALES.map((l) => l.flag).join(' ')}
              </p>
              <a
                className="btn-outline"
                href="https://github.com/lotuspegas-pixel/MyArcana-Startpagina"
                target="_blank"
                rel="noreferrer"
              >
                <Github size={15} /> {t('about.openSource')}
              </a>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
