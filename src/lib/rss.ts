import { stripHtml, truncate } from './util';

export interface FeedItem {
  title: string;
  link: string;
  date?: number;
  excerpt?: string;
  image?: string;
}

export interface Feed {
  title: string;
  items: FeedItem[];
}

/**
 * Feeds are almost never CORS-enabled, so a reader in the browser has to go
 * through a relay. We try each in turn and give up with a clear error rather
 * than showing a half-loaded widget.
 */
const RELAYS: ((url: string) => string)[] = [
  (u) => `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(u)}`,
  (u) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  (u) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
];

const text = (el: Element | null | undefined) => el?.textContent?.trim() ?? '';

function pickImage(item: Element): string | undefined {
  const enclosure = item.querySelector('enclosure[url]')?.getAttribute('url');
  if (enclosure && /\.(jpe?g|png|webp|gif|avif)/i.test(enclosure)) return enclosure;
  // media:content / media:thumbnail live in a namespace, so match by local name.
  for (const el of Array.from(item.getElementsByTagName('*'))) {
    const name = el.localName.toLowerCase();
    if (name === 'content' || name === 'thumbnail') {
      const url = el.getAttribute('url');
      if (url) return url;
    }
  }
  const html = text(item.querySelector('description')) || text(item.querySelector('encoded'));
  return /<img[^>]+src=["']([^"']+)["']/i.exec(html)?.[1];
}

/** Parses RSS 2.0 and Atom with the browser's own XML parser. */
export function parseFeedXml(xml: string): Feed {
  const doc = new DOMParser().parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Feed is not valid XML');

  const channel = doc.querySelector('channel');
  const entries = Array.from(doc.querySelectorAll('item, entry'));
  if (!entries.length && !channel) throw new Error('No feed items found');

  const items: FeedItem[] = entries.map((item) => {
    const linkEl = item.querySelector('link');
    const link = text(linkEl) || linkEl?.getAttribute('href') || '';
    const raw =
      text(item.querySelector('pubDate')) ||
      text(item.querySelector('published')) ||
      text(item.querySelector('updated')) ||
      text(item.querySelector('date'));
    const stamp = raw ? Date.parse(raw) : NaN;
    const body =
      text(item.querySelector('description')) ||
      text(item.querySelector('summary')) ||
      text(item.querySelector('content'));
    return {
      title: stripHtml(text(item.querySelector('title'))) || link,
      link,
      date: Number.isNaN(stamp) ? undefined : stamp,
      excerpt: body ? truncate(stripHtml(body), 180) : undefined,
      image: pickImage(item),
    };
  });

  return {
    title: stripHtml(text(channel?.querySelector('title') ?? doc.querySelector('title'))),
    items,
  };
}

interface Rss2JsonResponse {
  status?: string;
  feed?: { title?: string };
  items?: {
    title?: string;
    link?: string;
    pubDate?: string;
    description?: string;
    thumbnail?: string;
    enclosure?: { link?: string };
  }[];
}

function fromRss2Json(data: Rss2JsonResponse): Feed {
  if (data.status !== 'ok' || !Array.isArray(data.items)) {
    throw new Error('Relay returned no items');
  }
  return {
    title: data.feed?.title ?? '',
    items: data.items.map((i) => {
      const stamp = i.pubDate ? Date.parse(i.pubDate.replace(' ', 'T')) : NaN;
      return {
        title: stripHtml(i.title ?? '') || (i.link ?? ''),
        link: i.link ?? '',
        date: Number.isNaN(stamp) ? undefined : stamp,
        excerpt: i.description ? truncate(stripHtml(i.description), 180) : undefined,
        image: i.thumbnail || i.enclosure?.link || undefined,
      };
    }),
  };
}

export async function fetchFeed(url: string, signal?: AbortSignal): Promise<Feed> {
  let lastError: unknown;
  for (const [index, relay] of RELAYS.entries()) {
    try {
      const res = await fetch(relay(url), { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const body = await res.text();
      // The first relay answers JSON; the others hand back the raw feed.
      const feed = index === 0 ? fromRss2Json(JSON.parse(body)) : parseFeedXml(body);
      if (!feed.items.length) throw new Error('Feed is empty');
      return feed;
    } catch (err) {
      if (signal?.aborted) throw err;
      lastError = err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error('Feed could not be loaded');
}

/** Feeds offered in the RSS widget's own picker. */
export const FEED_PRESETS: { label: string; url: string }[] = [
  { label: 'NOS Nieuws', url: 'https://feeds.nos.nl/nosnieuwsalgemeen' },
  { label: 'NU.nl', url: 'https://www.nu.nl/rss/Algemeen' },
  { label: 'de Volkskrant', url: 'https://www.volkskrant.nl/voorpagina/rss.xml' },
  { label: 'NRC', url: 'https://www.nrc.nl/rss/' },
  { label: 'Tweakers', url: 'https://feeds.feedburner.com/tweakers/mixed' },
  { label: 'BBC World', url: 'https://feeds.bbci.co.uk/news/world/rss.xml' },
  { label: 'The Guardian', url: 'https://www.theguardian.com/world/rss' },
  { label: 'Reuters Top', url: 'https://news.google.com/rss/search?q=when:24h+allinurl:reuters.com' },
  { label: 'Al Jazeera', url: 'https://www.aljazeera.com/xml/rss/all.xml' },
  { label: 'Hacker News', url: 'https://hnrss.org/frontpage' },
  { label: 'The Verge', url: 'https://www.theverge.com/rss/index.xml' },
  { label: 'Ars Technica', url: 'https://feeds.arstechnica.com/arstechnica/index' },
  { label: 'Le Monde', url: 'https://www.lemonde.fr/rss/une.xml' },
  { label: 'Spiegel', url: 'https://www.spiegel.de/schlagzeilen/index.rss' },
  { label: 'El País', url: 'https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada' },
];
