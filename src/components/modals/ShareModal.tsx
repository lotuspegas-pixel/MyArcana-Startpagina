import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Copy, Link2 } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { encodePage } from '../../lib/share';
import type { Page } from '../../store/types';

export function ShareModal({
  page,
  onClose,
}: {
  page: Page | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const [url, setUrl] = useState<string | null>(null);
  const [tooLarge, setTooLarge] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!page) return;
    setUrl(null);
    setTooLarge(false);
    setCopied(false);
    void encodePage(page).then((link) => {
      if (link) setUrl(link);
      else setTooLarge(true);
    });
  }, [page]);

  if (!page) return null;

  const copy = async () => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard access can be refused; the field stays selectable.
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('share.title')}
      description={t('share.hint')}
      footer={
        <button className="btn-ghost" onClick={onClose}>
          {t('common.close')}
        </button>
      }
    >
      {tooLarge ? (
        <p className="rounded-md bg-amber-500/10 px-3 py-2.5 text-sm text-ink">
          {t('share.tooLarge')}
        </p>
      ) : !url ? (
        <div className="skeleton h-10 w-full" />
      ) : (
        <>
          <div className="flex gap-2">
            <input
              className="field font-mono text-xs"
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
            />
            <button className="btn-primary shrink-0" onClick={copy}>
              {copied ? <Check size={15} /> : <Copy size={15} />}
              {copied ? t('common.copied') : t('share.copyLink')}
            </button>
          </div>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-ink-faint">
            <Link2 size={12} /> {(url.length / 1024).toFixed(1)} kB
          </p>
        </>
      )}
    </Modal>
  );
}
