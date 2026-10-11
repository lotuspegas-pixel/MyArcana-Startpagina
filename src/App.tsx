import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, X } from 'lucide-react';
import { Header } from './components/layout/Header';
import { PageGrid } from './components/layout/PageGrid';
import { SettingsModal, type TabId } from './components/modals/SettingsModal';
import { TemplatesModal } from './components/modals/TemplatesModal';
import { ShortcutsModal } from './components/modals/ShortcutsModal';
import { ShareModal } from './components/modals/ShareModal';
import { PageBackgroundModal } from './components/modals/PageBackgroundModal';
import { ensureSeeded, useStore } from './store/useStore';
import { applyTheme } from './lib/theme';
import { applyDocumentLanguage } from './i18n';
import { clearShareHash, decodeSharedPage } from './lib/share';
import type { Page } from './store/types';
import { useShallow } from 'zustand/react/shallow';

export default function App() {
  const { t } = useTranslation();
  const {
    pages, activePageId, settings, setActivePage, replacePages, undo, redo,
  } = useStore(useShallow((s) => ({
    pages: s.pages,
    activePageId: s.activePageId,
    settings: s.settings,
    setActivePage: s.setActivePage,
    replacePages: s.replacePages,
    undo: s.undo,
    redo: s.redo,
  })));

  const [settingsTab, setSettingsTab] = useState<TabId | null>(null);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [sharing, setSharing] = useState<Page | null>(null);
  const [backgroundFor, setBackgroundFor] = useState<Page | null>(null);
  const [shared, setShared] = useState<Page | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const active = pages.find((p) => p.id === activePageId) ?? pages[0];

  /* --------------------------------------------------- first run & sharing */

  useEffect(() => {
    void decodeSharedPage(location.hash).then((page) => {
      if (page) setShared(page);
      // Only seed starter pages for a visitor who isn't opening a shared link.
      else ensureSeeded(t);
    });
    // Seeding must happen once, with whatever language is active at boot.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---------------------------------------------------------------- theme */

  useEffect(() => {
    applyTheme(settings, shared?.background ?? active?.background);
  }, [settings, active?.background, shared]);

  useEffect(() => {
    if (settings.themeMode !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(settings, shared?.background ?? active?.background);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [settings, active?.background, shared]);

  useEffect(() => {
    applyDocumentLanguage(settings.language);
  }, [settings.language]);

  /* ----------------------------------------------------------- shortcuts */

  const closeAll = useCallback(() => {
    setSettingsTab(null);
    setTemplatesOpen(false);
    setShortcutsOpen(false);
    setSharing(null);
    setBackgroundFor(null);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.isContentEditable ||
          ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'z') {
        // Let the browser handle undo inside a text field.
        if (typing) return;
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;

      if (typing) {
        if (e.key === 'Escape') target?.blur();
        return;
      }

      if (e.key === '/') {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setShortcutsOpen(true);
        return;
      }
      if (e.key === ',') {
        e.preventDefault();
        setSettingsTab('general');
        return;
      }
      if (e.key.toLowerCase() === 'e') {
        useStore.getState().updateSettings({ editMode: !settings.editMode });
        return;
      }
      if (e.key === 'Escape') {
        closeAll();
        return;
      }
      if (/^[1-9]$/.test(e.key)) {
        const page = pages[Number(e.key) - 1];
        if (page) setActivePage(page.id);
        return;
      }
      if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
        const index = pages.findIndex((p) => p.id === activePageId);
        const next = (index + (e.key === 'ArrowRight' ? 1 : -1) + pages.length) % pages.length;
        if (pages[next]) setActivePage(pages[next].id);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [pages, activePageId, settings.editMode, setActivePage, undo, redo, closeAll]);

  /* ----------------------------------------------------------- rendering */

  const maxWidth = settings.maxWidth ? `${settings.maxWidth}px` : undefined;
  const page = shared ?? active;

  if (!page) {
    return (
      <div className="grid min-h-screen place-items-center">
        <p className="text-sm text-ink-faint">{t('app.loading')}</p>
      </div>
    );
  }

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ ['--col-gap' as string]: `${settings.columnGap}px` }}
    >
      {shared ? (
        <div className="sticky top-0 z-40 flex flex-wrap items-center gap-2 bg-accent px-4 py-2
          text-sm text-accent-fg">
          <span className="font-medium">{t('share.viewing')}</span>
          <span className="opacity-80">· {shared.title}</span>
          <div className="ms-auto flex gap-2">
            <button
              className="btn bg-white/20 px-3 py-1.5 text-xs hover:bg-white/30"
              onClick={() => {
                replacePages([...pages, shared]);
                setActivePage(shared.id);
                clearShareHash();
                setShared(null);
              }}
            >
              <Check size={13} /> {t('share.import')}
            </button>
            <button
              className="btn bg-white/20 px-3 py-1.5 text-xs hover:bg-white/30"
              onClick={() => {
                clearShareHash();
                ensureSeeded(t);
                setShared(null);
              }}
            >
              <X size={13} /> {t('share.exit')}
            </button>
          </div>
        </div>
      ) : (
        <Header
          ref={searchRef}
          onOpenSettings={(tab) => setSettingsTab((tab as TabId) ?? 'general')}
          onOpenTemplates={() => setTemplatesOpen(true)}
          onOpenShortcuts={() => setShortcutsOpen(true)}
          onShare={setSharing}
          onPageBackground={setBackgroundFor}
        />
      )}

      <main
        className="mx-auto w-full flex-1 px-3 py-4 sm:px-5"
        style={{ maxWidth }}
      >
        <PageGrid key={page.id} page={page} editMode={!shared && settings.editMode} />
      </main>

      <footer className="mx-auto w-full px-3 pb-4 text-center sm:px-5" style={{ maxWidth }}>
        <p className="text-2xs text-ink-faint/80">
          my<span className="font-medium">Arcana</span> · {t('app.tagline')}
        </p>
      </footer>

      <SettingsModal
        open={settingsTab !== null}
        initialTab={settingsTab ?? undefined}
        onClose={() => setSettingsTab(null)}
      />
      <TemplatesModal open={templatesOpen} onClose={() => setTemplatesOpen(false)} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />
      <ShareModal page={sharing} onClose={() => setSharing(null)} />
      <PageBackgroundModal page={backgroundFor} onClose={() => setBackgroundFor(null)} />
    </div>
  );
}
