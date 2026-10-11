import { makeColumn, makePage, makeWidget } from '../store/defaults';
import type { Page } from '../store/types';
import { uid } from './util';

export interface TemplateMeta {
  id: string;
  icon: string;
  build: (t: (k: string) => string) => Page;
}

const link = (title: string, url: string) => ({
  id: uid('bm'),
  kind: 'link' as const,
  title,
  url,
  addedAt: Date.now(),
});

export const TEMPLATES: TemplateMeta[] = [
  {
    id: 'blank',
    icon: '📄',
    build: (t) =>
      makePage(t('template.blank'), [makeColumn(), makeColumn(), makeColumn()], '📄'),
  },
  {
    id: 'personal',
    icon: '🏠',
    build: (t) =>
      makePage(
        t('template.personal'),
        [
          makeColumn([
            makeWidget('search', t('widget.search'), {}, { bare: true }),
            makeWidget(
              'bookmarks',
              t('starter.favourites'),
              {
                view: 'tiles',
                columns: 3,
                bookmarks: [
                  link('Google', 'https://www.google.com'),
                  link('Gmail', 'https://mail.google.com'),
                  link('YouTube', 'https://www.youtube.com'),
                  link('WhatsApp', 'https://web.whatsapp.com'),
                  link('Agenda', 'https://calendar.google.com'),
                  link('Drive', 'https://drive.google.com'),
                ],
              },
              { color: '#6d4aff' }
            ),
          ]),
          makeColumn([
            makeWidget('rss', t('starter.news'), { feedLimit: 6 }, { color: '#dc2626' }),
            makeWidget('notes', t('starter.notes')),
          ]),
          makeColumn([
            makeWidget('weather', t('widget.weather'), {}, { color: '#0d9488' }),
            makeWidget('todo', t('starter.todo'), {}, { color: '#059669' }),
            makeWidget('clock', t('widget.clock')),
          ]),
        ],
        '🏠'
      ),
  },
  {
    id: 'work',
    icon: '💼',
    build: (t) =>
      makePage(
        t('template.work'),
        [
          makeColumn([
            makeWidget(
              'bookmarks',
              t('starter.tools'),
              {
                view: 'list',
                bookmarks: [
                  link('Gmail', 'https://mail.google.com'),
                  link('Calendar', 'https://calendar.google.com'),
                  link('Slack', 'https://app.slack.com'),
                  link('Teams', 'https://teams.microsoft.com'),
                  link('Notion', 'https://www.notion.so'),
                  link('Jira', 'https://www.atlassian.com/software/jira'),
                  link('Figma', 'https://www.figma.com'),
                  link('Drive', 'https://drive.google.com'),
                ],
              },
              { color: '#4f46e5' }
            ),
          ]),
          makeColumn([makeWidget('calendar', t('widget.calendar'), {}, { color: '#2563eb' })]),
          makeColumn([
            makeWidget('todo', t('starter.projects'), {}, { color: '#059669' }),
            makeWidget('worldclock', t('widget.worldclock')),
          ]),
          makeColumn([makeWidget('notes', t('starter.notes'))]),
        ],
        '💼'
      ),
  },
  {
    id: 'study',
    icon: '🎓',
    build: (t) =>
      makePage(
        t('template.study'),
        [
          makeColumn([
            makeWidget(
              'bookmarks',
              t('starter.study'),
              {
                view: 'list',
                bookmarks: [
                  link('Wikipedia', 'https://www.wikipedia.org'),
                  link('Google Scholar', 'https://scholar.google.com'),
                  link('Khan Academy', 'https://www.khanacademy.org'),
                  link('Coursera', 'https://www.coursera.org'),
                  link('WolframAlpha', 'https://www.wolframalpha.com'),
                  link('Quizlet', 'https://quizlet.com'),
                ],
              },
              { color: '#0ea5e9' }
            ),
          ]),
          makeColumn([
            makeWidget('todo', t('starter.todo'), {}, { color: '#059669' }),
            makeWidget('calendar', t('widget.calendar')),
          ]),
          makeColumn([
            makeWidget('countdown', t('widget.countdown'), {}, { color: '#c026d3' }),
            makeWidget('notes', t('starter.notes')),
            makeWidget('calculator', t('widget.calculator')),
          ]),
        ],
        '🎓'
      ),
  },
  {
    id: 'media',
    icon: '🎬',
    build: (t) =>
      makePage(
        t('template.media'),
        [
          makeColumn([
            makeWidget(
              'bookmarks',
              t('starter.watch'),
              {
                view: 'tiles',
                columns: 2,
                bookmarks: [
                  link('YouTube', 'https://www.youtube.com'),
                  link('Netflix', 'https://www.netflix.com'),
                  link('Disney+', 'https://www.disneyplus.com'),
                  link('Twitch', 'https://www.twitch.tv'),
                ],
              },
              { color: '#dc2626' }
            ),
          ]),
          makeColumn([
            makeWidget(
              'bookmarks',
              t('starter.listen'),
              {
                view: 'tiles',
                columns: 2,
                bookmarks: [
                  link('Spotify', 'https://open.spotify.com'),
                  link('SoundCloud', 'https://soundcloud.com'),
                  link('Apple Music', 'https://music.apple.com'),
                  link('Deezer', 'https://www.deezer.com'),
                ],
              },
              { color: '#059669' }
            ),
          ]),
          makeColumn([makeWidget('gallery', t('widget.gallery'))]),
        ],
        '🎬'
      ),
  },
  {
    id: 'news',
    icon: '📰',
    build: (t) =>
      makePage(
        t('template.news'),
        [
          makeColumn([
            makeWidget(
              'rss',
              'NOS',
              { feedUrl: 'https://feeds.nos.nl/nosnieuwsalgemeen', feedLimit: 8 },
              { color: '#dc2626' }
            ),
          ]),
          makeColumn([
            makeWidget(
              'rss',
              'BBC World',
              { feedUrl: 'https://feeds.bbci.co.uk/news/world/rss.xml', feedLimit: 8 },
              { color: '#b91c1c' }
            ),
          ]),
          makeColumn([
            makeWidget(
              'rss',
              'The Guardian',
              { feedUrl: 'https://www.theguardian.com/world/rss', feedLimit: 8 },
              { color: '#1d4ed8' }
            ),
          ]),
          makeColumn([
            makeWidget('weather', t('widget.weather'), {}, { color: '#0d9488' }),
            makeWidget('currency', t('widget.currency'), {}, { color: '#ca8a04' }),
          ]),
        ],
        '📰'
      ),
  },
  {
    id: 'developer',
    icon: '⌨️',
    build: (t) =>
      makePage(
        t('template.developer'),
        [
          makeColumn([
            makeWidget(
              'bookmarks',
              'Dev',
              {
                view: 'list',
                bookmarks: [
                  link('GitHub', 'https://github.com'),
                  link('Stack Overflow', 'https://stackoverflow.com'),
                  link('MDN', 'https://developer.mozilla.org'),
                  link('npm', 'https://www.npmjs.com'),
                  link('Can I use', 'https://caniuse.com'),
                  link('Regex101', 'https://regex101.com'),
                  link('Claude', 'https://claude.ai'),
                ],
              },
              { color: '#1f2937' }
            ),
          ]),
          makeColumn([
            makeWidget(
              'rss',
              'Hacker News',
              { feedUrl: 'https://hnrss.org/frontpage', feedLimit: 10 },
              { color: '#ea580c' }
            ),
          ]),
          makeColumn([
            makeWidget('todo', t('starter.projects'), {}, { color: '#059669' }),
            makeWidget('worldclock', t('widget.worldclock')),
            makeWidget('calculator', t('widget.calculator')),
          ]),
        ],
        '⌨️'
      ),
  },
];
