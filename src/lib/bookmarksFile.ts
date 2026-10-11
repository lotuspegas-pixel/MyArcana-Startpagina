import type { Bookmark } from '../store/types';
import { escapeHtml, uid } from './util';

export interface ImportedFolder {
  title: string;
  bookmarks: Bookmark[];
}

/**
 * Parses the Netscape bookmark file every browser exports. The format is
 * loose, nested `<DL>` lists with unclosed `<DT>` tags, so the browser's own
 * HTML parser is far more reliable here than a regex.
 */
export function parseBookmarksHtml(html: string): ImportedFolder[] {
  const doc = new DOMParser().parseFromString(html, 'text/html');

  const readList = (dl: Element): Bookmark[] => {
    const out: Bookmark[] = [];
    for (const dt of Array.from(dl.children).filter((c) => c.tagName === 'DT')) {
      const anchor = dt.querySelector(':scope > A');
      const header = dt.querySelector(':scope > H3');

      if (anchor) {
        const href = anchor.getAttribute('href') ?? '';
        // Skip the javascript: bookmarklets and empty separators browsers emit.
        if (!href || /^javascript:/i.test(href)) continue;
        const added = Number(anchor.getAttribute('add_date') ?? 0) * 1000;
        out.push({
          id: uid('bm'),
          kind: 'link',
          title: (anchor.textContent ?? '').trim() || href,
          url: href,
          icon: anchor.getAttribute('icon') ?? undefined,
          addedAt: Number.isFinite(added) && added > 0 ? added : Date.now(),
        });
        continue;
      }

      if (header) {
        // A folder's items live in the <DL> that follows its <H3>.
        let sibling = header.nextElementSibling;
        while (sibling && sibling.tagName !== 'DL') sibling = sibling.nextElementSibling;
        out.push({
          id: uid('fd'),
          kind: 'folder',
          title: (header.textContent ?? '').trim() || 'Folder',
          children: sibling ? readList(sibling) : [],
          addedAt: Date.now(),
        });
      }
    }
    return out;
  };

  const roots = Array.from(doc.querySelectorAll('body > dl, body > p > dl'));
  const lists = roots.length ? roots : Array.from(doc.querySelectorAll('dl')).slice(0, 1);
  const parsed = lists.flatMap((dl) => readList(dl));

  // Top-level folders become their own widgets; loose links get one together.
  const folders: ImportedFolder[] = [];
  const loose: Bookmark[] = [];
  for (const entry of parsed) {
    if (entry.kind === 'folder' && entry.children?.length) {
      folders.push({ title: entry.title, bookmarks: entry.children });
    } else if (entry.kind === 'link') {
      loose.push(entry);
    }
  }
  if (loose.length) folders.unshift({ title: 'Bookmarks', bookmarks: loose });
  return folders;
}

export function countBookmarks(list: Bookmark[]): number {
  return list.reduce(
    (sum, b) => sum + (b.kind === 'link' ? 1 : 0) + (b.children ? countBookmarks(b.children) : 0),
    0
  );
}

/** Writes a Netscape bookmark file any browser can import again. */
export function toBookmarksHtml(groups: { title: string; bookmarks: Bookmark[] }[]): string {
  const render = (list: Bookmark[], depth: number): string => {
    const pad = '    '.repeat(depth);
    return list
      .map((b) => {
        if (b.kind === 'folder') {
          return (
            `${pad}<DT><H3>${escapeHtml(b.title)}</H3>\n` +
            `${pad}<DL><p>\n${render(b.children ?? [], depth + 1)}${pad}</DL><p>\n`
          );
        }
        const added = Math.floor((b.addedAt || Date.now()) / 1000);
        const icon = b.icon ? ` ICON="${escapeHtml(b.icon)}"` : '';
        return `${pad}<DT><A HREF="${escapeHtml(b.url ?? '')}" ADD_DATE="${added}"${icon}>${escapeHtml(b.title)}</A>\n`;
      })
      .join('');
  };

  const body = groups
    .map(
      (g) =>
        `    <DT><H3>${escapeHtml(g.title)}</H3>\n    <DL><p>\n${render(g.bookmarks, 2)}    </DL><p>\n`
    )
    .join('');

  return (
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>\n' +
    '<!-- Exported by myArcana -->\n' +
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">\n' +
    '<TITLE>Bookmarks</TITLE>\n<H1>Bookmarks</H1>\n<DL><p>\n' +
    body +
    '</DL><p>\n'
  );
}
