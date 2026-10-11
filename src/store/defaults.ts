import { uid } from '../lib/util';
import { ACCENTS } from '../lib/theme';
import type { Bookmark, Column, Page, Settings, Widget, WidgetType } from './types';

export const SCHEMA_VERSION = 2;

const link = (title: string, url: string, color?: string): Bookmark => ({
  id: uid('bm'),
  kind: 'link',
  title,
  url,
  color,
  addedAt: Date.now(),
});

const folder = (title: string, children: Bookmark[]): Bookmark => ({
  id: uid('fd'),
  kind: 'folder',
  title,
  children,
  addedAt: Date.now(),
});

export const defaultSettings = (language: string): Settings => ({
  language,
  themeMode: 'system',
  accent: ACCENTS[0].hex,
  // 'none' follows the theme's own surface colour, so light and dark both work.
  background: { kind: 'none', value: '', blur: 0, dim: 0 },
  maxWidth: 1600,
  columnGap: 10,
  widgetOpacity: 1,
  fontScale: 1,
  radius: 8,
  showSearchBar: true,
  searchEngine: 'google',
  showClockInHeader: false,
  showGreeting: true,
  userName: '',
  openLinksInNewTab: false,
  showPageTabs: true,
  compactHeader: false,
  editMode: true,
  confirmDelete: true,
  weatherUnits: 'metric',
  format24: true,
  weekStart: 1,
});

/** Config every widget type starts with when freshly added. */
export function defaultConfig(type: WidgetType): Widget['config'] {
  switch (type) {
    case 'bookmarks':
      return { bookmarks: [], view: 'list', showFavicons: true, columns: 3, sort: 'manual' };
    case 'notes':
      return { text: '' };
    case 'html':
      return { text: '<p>…</p>' };
    case 'todo':
      return { todos: [], hideCompleted: false };
    case 'rss':
      return {
        feedUrl: 'https://feeds.nos.nl/nosnieuwsalgemeen',
        feedLimit: 8,
        showImages: true,
        showDates: true,
        showExcerpt: false,
      };
    case 'weather':
      return { place: 'Amsterdam', latitude: 52.374, longitude: 4.89, units: 'metric', forecastDays: 4 };
    case 'clock':
      return { format24: true, showSeconds: false, showDate: true, analog: false };
    case 'worldclock':
      return {
        format24: true,
        timeZones: [
          { id: uid('tz'), label: 'Amsterdam', tz: 'Europe/Amsterdam' },
          { id: uid('tz'), label: 'New York', tz: 'America/New_York' },
          { id: uid('tz'), label: 'Tokyo', tz: 'Asia/Tokyo' },
          { id: uid('tz'), label: 'Sydney', tz: 'Australia/Sydney' },
        ],
      };
    case 'calendar':
      return { weekStart: 1, showWeekNumbers: true };
    case 'embed':
      return { url: '', height: 320 };
    case 'image':
      return { url: '', caption: '', link: '' };
    case 'gallery':
      return { images: [], interval: 6 };
    case 'countdown': {
      const d = new Date();
      d.setMonth(11, 31);
      d.setHours(23, 59, 0, 0);
      return { target: d.toISOString().slice(0, 16) };
    }
    case 'search':
      return { engine: 'google' };
    case 'calculator':
      return {};
    case 'currency':
      return { from: 'EUR', to: 'USD', amount: 100 };
    case 'stocks':
      return { symbols: ['AAPL', 'MSFT', 'GOOGL'] };
    case 'chart':
      return {
        chartKind: 'bar',
        series: [
          { label: 'Ma', value: 12 },
          { label: 'Di', value: 19 },
          { label: 'Wo', value: 9 },
          { label: 'Do', value: 22 },
          { label: 'Vr', value: 16 },
        ],
      };
    case 'heading':
      return { text: '', level: 2, align: 'start' };
    case 'quote':
      return { text: '', author: '' };
    default:
      return {};
  }
}

export const makeWidget = (
  type: WidgetType,
  title: string,
  config: Partial<Widget['config']> = {},
  extra: Partial<Widget> = {}
): Widget => ({
  id: uid('w'),
  type,
  title,
  config: { ...defaultConfig(type), ...config },
  ...extra,
});

export const makeColumn = (widgets: Widget[] = [], width = 1): Column => ({
  id: uid('col'),
  width,
  widgets,
});

export const makePage = (title: string, columns: Column[], icon = '🏠'): Page => ({
  id: uid('pg'),
  title,
  icon,
  columns,
  createdAt: Date.now(),
});

/** The page a brand-new visitor lands on. */
export function starterPages(t: (k: string) => string): Page[] {
  const favourites = makeWidget('bookmarks', t('starter.favourites'), {
    view: 'list',
    bookmarks: [
      link('Google', 'https://www.google.com'),
      link('YouTube', 'https://www.youtube.com'),
      link('Gmail', 'https://mail.google.com'),
      link('Wikipedia', 'https://www.wikipedia.org'),
      link('ChatGPT', 'https://chat.openai.com'),
      link('Claude', 'https://claude.ai'),
      link('GitHub', 'https://github.com'),
      link('Maps', 'https://maps.google.com'),
      link('Drive', 'https://drive.google.com'),
    ],
  });

  const social = makeWidget('bookmarks', t('starter.social'), {
    view: 'icons',
    bookmarks: [
      link('WhatsApp', 'https://web.whatsapp.com'),
      link('Instagram', 'https://www.instagram.com'),
      link('Facebook', 'https://www.facebook.com'),
      link('X', 'https://x.com'),
      link('LinkedIn', 'https://www.linkedin.com'),
      link('Reddit', 'https://www.reddit.com'),
      link('TikTok', 'https://www.tiktok.com'),
      link('Discord', 'https://discord.com/app'),
    ],
  });

  const shopping = makeWidget('bookmarks', t('starter.shopping'), {
    view: 'list',
    bookmarks: [
      link('bol.com', 'https://www.bol.com'),
      link('Amazon', 'https://www.amazon.nl'),
      link('Marktplaats', 'https://www.marktplaats.nl'),
      link('Coolblue', 'https://www.coolblue.nl'),
      folder(t('starter.travel'), [
        link('Booking.com', 'https://www.booking.com'),
        link('NS', 'https://www.ns.nl'),
        link('Google Flights', 'https://www.google.com/travel/flights'),
        link('9292', 'https://9292.nl'),
      ]),
    ],
  });

  const news = makeWidget('rss', t('starter.news'), {
    feedUrl: 'https://feeds.nos.nl/nosnieuwsalgemeen',
    feedLimit: 7,
    showImages: true,
  });

  const todo = makeWidget('todo', t('starter.todo'), {
    todos: [
      { id: uid('td'), text: t('starter.todo1'), done: false, createdAt: Date.now() },
      { id: uid('td'), text: t('starter.todo2'), done: false, createdAt: Date.now() },
      { id: uid('td'), text: t('starter.todo3'), done: true, createdAt: Date.now() },
    ],
  });

  const notes = makeWidget('notes', t('starter.notes'), { text: t('starter.notesBody') });
  const weather = makeWidget('weather', t('widget.weather'), {});
  const clock = makeWidget('clock', t('widget.clock'), { analog: false });

  return [
    makePage(t('starter.pageStart'), [
      makeColumn([favourites, social]),
      makeColumn([news, notes]),
      makeColumn([weather, todo, clock]),
      makeColumn([shopping]),
    ]),
    makePage(t('starter.pageWork'), [
      makeColumn([
        makeWidget('bookmarks', t('starter.tools'), {
          view: 'list',
          bookmarks: [
            link('Gmail', 'https://mail.google.com'),
            link('Google Agenda', 'https://calendar.google.com'),
            link('Drive', 'https://drive.google.com'),
            link('Notion', 'https://www.notion.so'),
            link('Slack', 'https://app.slack.com'),
            link('Teams', 'https://teams.microsoft.com'),
            link('Trello', 'https://trello.com'),
            link('Figma', 'https://www.figma.com'),
          ],
        }),
      ]),
      makeColumn([makeWidget('calendar', t('widget.calendar'), {})]),
      makeColumn([
        makeWidget('todo', t('starter.projects'), { todos: [] }),
        makeWidget('worldclock', t('widget.worldclock')),
      ]),
    ], '💼'),
    makePage(t('starter.pageMedia'), [
      makeColumn([
        makeWidget('bookmarks', t('starter.watch'), {
          view: 'tiles',
          columns: 2,
          bookmarks: [
            link('YouTube', 'https://www.youtube.com'),
            link('Netflix', 'https://www.netflix.com'),
            link('NPO Start', 'https://npo.nl'),
            link('Disney+', 'https://www.disneyplus.com'),
            link('Twitch', 'https://www.twitch.tv'),
            link('Videoland', 'https://www.videoland.com'),
          ],
        }),
      ]),
      makeColumn([
        makeWidget('bookmarks', t('starter.listen'), {
          view: 'tiles',
          columns: 2,
          bookmarks: [
            link('Spotify', 'https://open.spotify.com'),
            link('SoundCloud', 'https://soundcloud.com'),
            link('Apple Music', 'https://music.apple.com'),
            link('NPO Radio 2', 'https://www.nporadio2.nl'),
          ],
        }),
      ]),
      makeColumn([makeWidget('countdown', t('widget.countdown'), {})]),
    ], '🎬'),
  ];
}
