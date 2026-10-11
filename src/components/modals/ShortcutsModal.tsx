import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';

const ROWS: { keys: string[]; labelKey: string }[] = [
  { keys: ['/'], labelKey: 'shortcuts.search' },
  { keys: ['n'], labelKey: 'shortcuts.addWidget' },
  { keys: [','], labelKey: 'shortcuts.settings' },
  { keys: ['e'], labelKey: 'shortcuts.editMode' },
  { keys: ['→'], labelKey: 'shortcuts.nextPage' },
  { keys: ['←'], labelKey: 'shortcuts.prevPage' },
  { keys: ['1', '…', '9'], labelKey: 'shortcuts.gotoPage' },
  { keys: ['⌘/Ctrl', 'Z'], labelKey: 'shortcuts.undo' },
  { keys: ['⌘/Ctrl', '⇧', 'Z'], labelKey: 'shortcuts.redo' },
  { keys: ['Esc'], labelKey: 'shortcuts.close' },
  { keys: ['?'], labelKey: 'shortcuts.help' },
];

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  return (
    <Modal open={open} onClose={onClose} title={t('shortcuts.title')}>
      <dl className="divide-y divide-line">
        {ROWS.map((row) => (
          <div key={row.labelKey} className="flex items-center justify-between gap-4 py-2">
            <dt className="text-sm text-ink">{t(row.labelKey)}</dt>
            <dd className="flex shrink-0 gap-1">
              {row.keys.map((k, i) => (
                <kbd
                  key={i}
                  className="rounded border border-line bg-surface-sunken px-1.5 py-0.5
                    font-mono text-2xs text-ink-muted shadow-sm"
                >
                  {k}
                </kbd>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-ink-faint">{t('search.bangHint')}</p>
    </Modal>
  );
}
