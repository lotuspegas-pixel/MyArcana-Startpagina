import { useTranslation } from 'react-i18next';
import { Modal } from '../ui/Modal';
import { ColorSwatches, Field, SegmentedControl, Slider } from '../ui/Controls';
import { GRADIENTS, SOLID_BACKGROUNDS, WALLPAPERS } from '../../lib/theme';
import { useStore } from '../../store/useStore';
import type { Background, Page } from '../../store/types';
import { cx } from '../../lib/util';

export function PageBackgroundModal({
  page,
  onClose,
}: {
  page: Page | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const setPageBackground = useStore((s) => s.setPageBackground);
  const live = useStore((s) => s.pages.find((p) => p.id === page?.id));

  if (!page || !live) return null;
  const bg = live.background;

  const set = (patch: Partial<Background>) =>
    setPageBackground(live.id, {
      kind: patch.kind ?? bg?.kind ?? 'color',
      value: patch.value ?? bg?.value ?? SOLID_BACKGROUNDS[0],
      blur: patch.blur ?? bg?.blur ?? 0,
      dim: patch.dim ?? bg?.dim ?? 0,
    });

  return (
    <Modal
      open
      onClose={onClose}
      size="lg"
      title={t('page.background')}
      description={live.title}
      footer={
        <>
          <button
            className="btn-ghost"
            onClick={() => {
              setPageBackground(live.id, undefined);
              onClose();
            }}
          >
            {t('theme.useGlobal')}
          </button>
          <button className="btn-primary" onClick={onClose}>
            {t('common.done')}
          </button>
        </>
      }
    >
      <Field label={t('theme.perPage')}>
        <SegmentedControl
          value={bg?.kind ?? 'none'}
          onChange={(kind) =>
            set({
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

      {bg?.kind === 'color' && (
        <ColorSwatches
          colors={SOLID_BACKGROUNDS}
          value={bg.value}
          onChange={(value) => value && set({ value })}
        />
      )}

      {bg?.kind === 'gradient' && (
        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {GRADIENTS.map((g) => (
            <button
              key={g}
              onClick={() => set({ value: g })}
              style={{ background: g }}
              className={cx(
                'h-12 rounded-md transition-transform hover:scale-105',
                bg.value === g && 'ring-2 ring-offset-2 ring-offset-surface-raised ring-accent'
              )}
            />
          ))}
        </div>
      )}

      {bg?.kind === 'image' && (
        <>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {WALLPAPERS.map((w) => (
              <button
                key={w.url}
                onClick={() => set({ value: w.url })}
                title={w.credit}
                className={cx(
                  'overflow-hidden rounded-md transition-transform hover:scale-105',
                  bg.value === w.url && 'ring-2 ring-offset-2 ring-offset-surface-raised ring-accent'
                )}
              >
                <img src={w.thumb} alt={w.credit} loading="lazy" className="h-14 w-full object-cover" />
              </button>
            ))}
          </div>
          <Field label={t('theme.customImage')} className="mt-4">
            <input
              className="field"
              value={bg.value}
              placeholder="https://…"
              onChange={(e) => set({ value: e.target.value.trim() })}
            />
          </Field>
        </>
      )}

      {bg && bg.kind !== 'none' && (
        <div className="mt-4 border-t border-line pt-4">
          <Slider
            label={t('theme.blur')}
            min={0}
            max={24}
            value={bg.blur ?? 0}
            onChange={(blur) => set({ blur })}
            format={(v) => `${v}px`}
          />
          <Slider
            label={t('theme.dim')}
            min={0}
            max={0.75}
            step={0.05}
            value={bg.dim ?? 0}
            onChange={(dim) => set({ dim })}
            format={(v) => `${Math.round(v * 100)}%`}
          />
        </div>
      )}
    </Modal>
  );
}
