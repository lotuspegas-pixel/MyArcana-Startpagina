import { forwardRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ChevronDown, Database, Eye, Globe, HelpCircle, Keyboard, LayoutTemplate,
  MoreHorizontal, Palette, Pencil, Redo2, Settings, Undo2,
} from 'lucide-react';
import { useShallow } from 'zustand/react/shallow';
import { SearchBar } from './SearchBar';
import { PageTabs } from './PageTabs';
import { Menu, MenuItem, MenuLabel, MenuSeparator } from '../ui/Menu';
import { useStore } from '../../store/useStore';
import { LOCALES } from '../../lib/locales';
import { setLanguage } from '../../i18n';
import type { Page } from '../../store/types';
import { cx } from '../../lib/util';
import { useTicker } from '../../hooks/useTicker';

interface Props {
  onOpenSettings: (tab?: string) => void;
  onOpenTemplates: () => void;
  onOpenShortcuts: () => void;
  onShare: (page: Page) => void;
  onPageBackground: (page: Page) => void;
}

function greetingKey(hour: number): string {
  if (hour < 6) return 'greeting.night';
  if (hour < 12) return 'greeting.morning';
  if (hour < 18) return 'greeting.afternoon';
  return 'greeting.evening';
}

export const Header = forwardRef<HTMLInputElement, Props>(function Header(
  { onOpenSettings, onOpenTemplates, onOpenShortcuts, onShare, onPageBackground },
  searchRef
) {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, undo, redo } = useStore(
    useShallow((s) => ({
      settings: s.settings,
      updateSettings: s.updateSettings,
      undo: s.undo,
      redo: s.redo,
    }))
  );

  const now = useTicker(settings.showClockInHeader ? 15000 : 600_000);
  const clock = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: !settings.format24,
  }).format(now);

  const greeting = settings.userName
    ? `${t(greetingKey(new Date(now).getHours()))}, ${settings.userName}`
    : t(greetingKey(new Date(now).getHours()));

  const maxWidth = settings.maxWidth ? `${settings.maxWidth}px` : undefined;

  return (
    <header className="sticky top-0 z-40 bg-surface-raised/95 backdrop-blur-md">
      <div
        className="mx-auto flex w-full items-center gap-2 px-3 sm:px-5"
        style={{ maxWidth, height: settings.compactHeader ? 42 : 48 }}
      >
        {/* The workspace pill doubles as the brand and the way back home. */}
        <a
          href="."
          className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink/[0.07] py-1 pe-2 ps-1
            transition-colors hover:bg-ink/[0.12]"
          aria-label={t('app.name')}
        >
          <img src="./favicon.svg" alt="" className="h-6 w-6 rounded-full" />
          <span className="hidden text-[13px] font-semibold tracking-tight text-ink sm:block">
            my<span className="text-accent">Arcana</span>
          </span>
          <ChevronDown size={13} className="hidden text-ink-faint sm:block" />
        </a>

        {settings.showSearchBar ? (
          <div className="min-w-0 flex-1 md:max-w-md">
            <SearchBar ref={searchRef} />
          </div>
        ) : (
          <div className="flex-1" />
        )}

        <div className="flex shrink-0 items-center gap-0.5">
          {settings.showClockInHeader && (
            <span className="me-1 hidden text-[13px] font-medium tabular-nums text-ink-muted sm:block">
              {clock}
            </span>
          )}

          {settings.editMode && (
            <>
              <button
                className="btn-icon hidden h-8 w-8 sm:grid"
                onClick={undo}
                aria-label={t('common.undo')}
                title={`${t('common.undo')} (⌘Z)`}
              >
                <Undo2 size={15} />
              </button>
              <button
                className="btn-icon hidden h-8 w-8 sm:grid"
                onClick={redo}
                aria-label={t('common.redo')}
                title={`${t('common.redo')} (⌘⇧Z)`}
              >
                <Redo2 size={15} />
              </button>
            </>
          )}

          <button
            className={cx(
              'btn-icon h-8 w-8',
              settings.editMode && 'bg-accent/15 text-accent hover:bg-accent/25'
            )}
            onClick={() => updateSettings({ editMode: !settings.editMode })}
            aria-pressed={settings.editMode}
            title={settings.editMode ? t('nav.viewMode') : t('nav.editMode')}
          >
            {settings.editMode ? <Pencil size={15} /> : <Eye size={15} />}
          </button>

          <Menu
            trigger={(p) => (
              <button
                {...p}
                className="btn-icon h-8 w-8"
                aria-label={t('common.language')}
                title={t('common.language')}
              >
                <Globe size={15} />
              </button>
            )}
          >
            <MenuLabel>{t('settings.language')}</MenuLabel>
            <div className="max-h-80 overflow-y-auto">
              {LOCALES.map((l) => (
                <MenuItem
                  key={l.code}
                  checked={l.code === settings.language}
                  icon={<span aria-hidden>{l.flag}</span>}
                  onClick={() => {
                    updateSettings({ language: l.code });
                    void setLanguage(l.code);
                  }}
                >
                  {l.native}
                </MenuItem>
              ))}
            </div>
          </Menu>

          <Menu
            trigger={(p) => (
              <button {...p} className="btn-icon h-8 w-8" aria-label={t('nav.menu')}>
                <MoreHorizontal size={16} />
              </button>
            )}
          >
            <MenuItem
              icon={<Settings size={15} />}
              shortcut=","
              onClick={() => onOpenSettings('general')}
            >
              {t('settings.title')}
            </MenuItem>
            <MenuItem icon={<Palette size={15} />} onClick={() => onOpenSettings('appearance')}>
              {t('settings.appearance')}
            </MenuItem>
            <MenuItem icon={<LayoutTemplate size={15} />} onClick={onOpenTemplates}>
              {t('template.title')}
            </MenuItem>
            <MenuItem icon={<Database size={15} />} onClick={() => onOpenSettings('data')}>
              {t('data.title')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Keyboard size={15} />} shortcut="?" onClick={onOpenShortcuts}>
              {t('nav.shortcuts')}
            </MenuItem>
            <MenuItem icon={<HelpCircle size={15} />} onClick={() => onOpenSettings('about')}>
              {t('nav.about')}
            </MenuItem>
          </Menu>
        </div>
      </div>

      {settings.showPageTabs && (
        <div
          className="mx-auto flex w-full items-center gap-2 px-3 pb-1 sm:px-5"
          style={{ maxWidth }}
        >
          <PageTabs
            editMode={settings.editMode}
            onShare={onShare}
            onTemplates={onOpenTemplates}
            onPageBackground={onPageBackground}
          />
          {settings.showGreeting && (
            <span className="ms-auto hidden shrink-0 truncate text-[11px] text-ink-faint lg:block">
              {greeting}
            </span>
          )}
        </div>
      )}
    </header>
  );
});
