import { useTranslation } from 'react-i18next';
import { SearchBar } from '../layout/SearchBar';
import { useStore } from '../../store/useStore';
import type { Widget } from '../../store/types';

export function SearchWidget({ widget, configuring }: { widget: Widget; editMode: boolean; configuring: boolean }) {
  const { t } = useTranslation();
  const patch = useStore((s) => s.patchWidgetConfig);
  const globalEngine = useStore((s) => s.settings.searchEngine);

  return (
    <div className="p-2.5">
      <SearchBar
        size="lg"
        engineId={widget.config.engine ?? globalEngine}
        onEngineChange={(engine) => patch(widget.id, { engine })}
      />
      {configuring && (
        <p className="mt-1.5 px-2 text-center text-2xs text-ink-faint">
          {t('search.bangHint')}
        </p>
      )}
    </div>
  );
}
