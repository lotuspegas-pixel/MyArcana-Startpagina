import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { TEMPLATES } from '../../lib/templates';
import { useStore } from '../../store/useStore';
import { useShallow } from 'zustand/react/shallow';

export function TemplatesModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useTranslation();
  const { pages, replacePages, setActivePage } = useStore(useShallow((s) => ({
    pages: s.pages,
    replacePages: s.replacePages,
    setActivePage: s.setActivePage,
  })));

  const use = (id: string) => {
    const template = TEMPLATES.find((x) => x.id === id);
    if (!template) return;
    const page = template.build(t);
    replacePages([...pages, page]);
    setActivePage(page.id);
    onClose();
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={t('template.title')}
      description={t('template.hint')}
    >
      <ul className="grid gap-2 sm:grid-cols-2">
        {TEMPLATES.map((tpl) => (
          <li key={tpl.id}>
            <button
              onClick={() => use(tpl.id)}
              className="flex h-full w-full items-start gap-3 rounded-lg border border-line
                bg-surface p-3.5 text-start transition-colors hover:border-accent/50
                hover:bg-accent/5"
            >
              <span className="text-2xl leading-none" aria-hidden>
                {tpl.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink">
                  {t(`template.${tpl.id}`)}
                </span>
                <span className="mt-0.5 block text-xs leading-snug text-ink-muted">
                  {t(`template.${tpl.id}.desc`)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
