import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { ColorSwatches, Field } from '../ui/Controls';
import { Favicon } from '../ui/Favicon';
import { WIDGET_COLORS } from '../../lib/theme';
import { normalizeUrl, titleFromUrl } from '../../lib/util';
import type { Bookmark } from '../../store/types';

export interface BookmarkDraft {
  id?: string;
  kind: 'link' | 'folder';
  title: string;
  url: string;
  icon: string;
  color?: string;
  note: string;
}

export const emptyDraft = (kind: 'link' | 'folder' = 'link'): BookmarkDraft => ({
  kind,
  title: '',
  url: '',
  icon: '',
  note: '',
});

export const draftOf = (bm: Bookmark): BookmarkDraft => ({
  id: bm.id,
  kind: bm.kind,
  title: bm.title,
  url: bm.url ?? '',
  icon: bm.icon ?? '',
  color: bm.color,
  note: bm.note ?? '',
});

export function BookmarkEditor({
  draft,
  onClose,
  onSave,
}: {
  draft: BookmarkDraft | null;
  onClose: () => void;
  onSave: (d: BookmarkDraft) => void;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState<BookmarkDraft>(draft ?? emptyDraft());

  useEffect(() => {
    if (draft) setValue(draft);
  }, [draft]);

  if (!draft) return null;
  const isFolder = value.kind === 'folder';

  const save = () => {
    const url = isFolder ? '' : normalizeUrl(value.url);
    const title = value.title.trim() || (url ? titleFromUrl(url) : t('bookmark.newFolder'));
    onSave({ ...value, url, title });
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={
        value.id
          ? t('bookmark.edit')
          : isFolder
            ? t('bookmark.addFolder')
            : t('bookmark.add')
      }
      footer={
        <>
          <button className="btn-ghost" onClick={onClose}>
            {t('common.cancel')}
          </button>
          <button
            className="btn-primary"
            onClick={save}
            disabled={!isFolder && !value.url.trim() && !value.title.trim()}
          >
            {t('common.save')}
          </button>
        </>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          save();
        }}
      >
        {!isFolder && (
          <Field label={t('bookmark.url')}>
            <input
              className="field"
              value={value.url}
              placeholder={t('bookmark.urlPlaceholder')}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              onChange={(e) => setValue({ ...value, url: e.target.value })}
              onBlur={(e) => {
                // Fill an empty title from the host once a URL is in place.
                if (!value.title.trim() && e.target.value.trim()) {
                  setValue((v) => ({ ...v, title: titleFromUrl(e.target.value) }));
                }
              }}
            />
          </Field>
        )}

        <Field label={t('bookmark.title')}>
          <div className="flex items-center gap-2.5">
            <Favicon
              url={value.url}
              icon={value.icon || undefined}
              title={value.title || '?'}
              size={32}
              rounded="md"
            />
            <input
              className="field"
              value={value.title}
              onChange={(e) => setValue({ ...value, title: e.target.value })}
            />
          </div>
        </Field>

        {!isFolder && (
          <>
            <Field label={`${t('bookmark.iconUrl')} (${t('common.optional')})`}>
              <input
                className="field"
                value={value.icon}
                placeholder="https://…/icon.png"
                onChange={(e) => setValue({ ...value, icon: e.target.value })}
              />
            </Field>

            <Field label={`${t('common.note')} (${t('common.optional')})`} hint={t('bookmark.noteHint')}>
              <input
                className="field"
                value={value.note}
                onChange={(e) => setValue({ ...value, note: e.target.value })}
              />
            </Field>
          </>
        )}

        <Field label={t('common.color')}>
          <ColorSwatches
            colors={WIDGET_COLORS}
            value={value.color}
            onChange={(color) => setValue({ ...value, color })}
            allowNone
            noneLabel={t('common.none')}
          />
        </Field>

        <button type="submit" className="sr-only" aria-hidden />
      </form>
    </Modal>
  );
}
