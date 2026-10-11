import { useCallback, useState } from 'react';
import { WidgetFrame } from './WidgetFrame';
import { RegisterAddContext, type AddHandler } from './WidgetContext';
import { BookmarksWidget } from './BookmarksWidget';
import { TodoWidget } from './TodoWidget';
import { HeadingWidget, HtmlWidget, NotesWidget, QuoteWidget } from './TextWidgets';
import { CalendarWidget, ClockWidget, CountdownWidget, WorldClockWidget } from './TimeWidgets';
import { RssWidget } from './RssWidget';
import { WeatherWidget } from './WeatherWidget';
import { EmbedWidget, GalleryWidget, ImageWidget } from './MediaWidgets';
import { CalculatorWidget, ChartWidget, CurrencyWidget, StocksWidget } from './ToolWidgets';
import { SearchWidget } from './SearchWidget';
import type { Widget } from '../../store/types';

interface BodyProps {
  widget: Widget;
  editMode: boolean;
  /** True while the widget's settings panel is open. */
  configuring: boolean;
}

/** Maps a widget's type onto its renderer. */
function WidgetBody({ widget, editMode, configuring }: BodyProps) {
  const props = { widget, editMode, configuring };
  switch (widget.type) {
    case 'bookmarks':
      return <BookmarksWidget {...props} />;
    case 'notes':
      return <NotesWidget {...props} />;
    case 'html':
      return <HtmlWidget {...props} />;
    case 'heading':
      return <HeadingWidget {...props} />;
    case 'quote':
      return <QuoteWidget {...props} />;
    case 'todo':
      return <TodoWidget {...props} />;
    case 'rss':
      return <RssWidget {...props} />;
    case 'weather':
      return <WeatherWidget {...props} />;
    case 'clock':
      return <ClockWidget {...props} />;
    case 'worldclock':
      return <WorldClockWidget {...props} />;
    case 'calendar':
      return <CalendarWidget {...props} />;
    case 'countdown':
      return <CountdownWidget {...props} />;
    case 'embed':
      return <EmbedWidget {...props} />;
    case 'image':
      return <ImageWidget {...props} />;
    case 'gallery':
      return <GalleryWidget {...props} />;
    case 'search':
      return <SearchWidget {...props} />;
    case 'calculator':
      return <CalculatorWidget />;
    case 'currency':
      return <CurrencyWidget {...props} />;
    case 'stocks':
      return <StocksWidget {...props} />;
    case 'chart':
      return <ChartWidget {...props} />;
    default:
      return null;
  }
}

export function WidgetView({ widget, editMode }: { widget: Widget; editMode: boolean }) {
  const [configuring, setConfiguring] = useState(false);
  // Held as a one-element tuple so storing a function in state does not make
  // React treat it as a lazy initialiser.
  const [add, setAdd] = useState<[AddHandler]>([null]);

  const register = useCallback((handler: AddHandler) => setAdd([handler]), []);

  return (
    <WidgetFrame
      widget={widget}
      editMode={editMode}
      configuring={editMode && configuring}
      onToggleConfigure={() => setConfiguring((v) => !v)}
      onAdd={add[0]}
    >
      <RegisterAddContext.Provider value={register}>
        <WidgetBody widget={widget} editMode={editMode} configuring={editMode && configuring} />
      </RegisterAddContext.Provider>
    </WidgetFrame>
  );
}
