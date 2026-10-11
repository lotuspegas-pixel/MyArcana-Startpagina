/**
 * End-to-end smoke test. Drives a real browser against the production build
 * and checks the behaviour that is easy to break and hard to typecheck:
 * rendering, translation, drag and drop, import, sharing and persistence.
 *
 *   npm run build && npm run preview &
 *   npm run smoke
 *
 * `PW_CHROMIUM` points at an existing Chromium when the machine already has
 * one; otherwise run `npx playwright install chromium` first.
 */
import { chromium } from 'playwright';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const BASE = process.env.BASE ?? 'http://127.0.0.1:4173';
const SHOTS = process.env.SHOTS ?? null;
const work = mkdtempSync(join(tmpdir(), 'myarcana-smoke-'));

const SAMPLE_BOOKMARKS = `<!DOCTYPE NETSCAPE-Bookmark-file-1>
<TITLE>Bookmarks</TITLE><H1>Bookmarks</H1>
<DL><p>
  <DT><H3>Bookmarks bar</H3>
  <DL><p>
    <DT><A HREF="https://nos.nl" ADD_DATE="1700000001">NOS</A>
    <DT><A HREF="https://tweakers.net">Tweakers</A>
    <DT><H3>Werk</H3>
    <DL><p>
      <DT><A HREF="https://github.com">GitHub</A>
      <DT><A HREF="https://linear.app">Linear</A>
    </DL><p>
    <DT><A HREF="javascript:void(0)">Bookmarklet</A>
  </DL><p>
  <DT><H3>Recepten</H3>
  <DL><p>
    <DT><A HREF="https://ah.nl/allerhande">Allerhande</A>
    <DT><A HREF="https://www.24kitchen.nl">24Kitchen</A>
  </DL><p>
  <DT><A HREF="https://example.com">Losse link</A>
</DL><p>`;

const bookmarksFile = join(work, 'bookmarks.html');
writeFileSync(bookmarksFile, SAMPLE_BOOKMARKS);

const problems = [];
let checks = 0;

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM || undefined,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 1500, height: 1000 }, locale: 'nl-NL' });

// Outbound calls to weather, feeds and favicon services may be unavailable
// (offline, firewall); that is not an application fault.
const NETWORK_NOISE = /ERR_|net::|Failed to load resource|Failed to fetch|NetworkError/i;
page.on('console', (m) => {
  if (m.type() === 'error' && !NETWORK_NOISE.test(m.text())) problems.push(`console: ${m.text()}`);
});
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));

async function check(label, fn) {
  checks += 1;
  try {
    const value = await fn();
    const ok = value !== false;
    console.log(`  ${ok ? 'ok  ' : 'FAIL'}  ${label}${ok && value !== true ? ` → ${value}` : ''}`);
    if (!ok) problems.push(label);
  } catch (err) {
    console.log(`  FAIL  ${label} → ${err.message.split('\n')[0]}`);
    problems.push(`${label}: ${err.message.split('\n')[0]}`);
  }
}

const shot = (name) => (SHOTS ? page.screenshot({ path: join(SHOTS, `${name}.png`) }) : null);
const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('myarcana-store')).state);
const activePage = async () => {
  const s = await state();
  return s.pages.find((p) => p.id === s.activePageId);
};
// Widget titles are <input> fields in edit mode, so locate sections by value.
const sectionTitled = (title) =>
  page.locator('section').filter({ has: page.locator(`h2 input[value="${title}"]`) }).first();

const dragTo = async (from, to, toOffsetY = 24) => {
  const a = await from.boundingBox();
  const b = await to.boundingBox();
  await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
  await page.mouse.down();
  await page.mouse.move(a.x + 30, a.y + 20, { steps: 6 });
  await page.mouse.move(b.x + b.width / 2, b.y + toOffsetY, { steps: 12 });
  await page.mouse.up();
  await page.waitForTimeout(500);
};

await page.goto(BASE, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(2200);

console.log('— first render —');
await check('document language is Dutch', async () => (await page.getAttribute('html', 'lang')) === 'nl');
await check('brand is visible', () => page.locator('header').getByText('Arcana').first().isVisible());
await check('starter widgets rendered', async () => {
  const n = await page.locator('main section').count();
  return n >= 6 ? `${n} widgets` : false;
});
await check('UI is translated', async () => {
  const ph = await page.locator('input[enterkeyhint="search"]').first().getAttribute('placeholder');
  return ph?.includes('Zoeken') ? ph : false;
});
await check('clock renders a time', async () => {
  const match = /\d{1,2}[:.]\d{2}/.exec(await sectionTitled('Klok').innerText());
  return match ? match[0] : false;
});
await shot('01-start');

console.log('— card header —');
const openWidgetSettings = async (title) => {
  await sectionTitled(title).getByRole('button', { name: /Opties/ }).first().click();
  await page.waitForTimeout(200);
  await page.getByRole('menuitem', { name: /Widget-instellingen/ }).click();
  await page.waitForTimeout(250);
};
await check('settings hidden by default', async () =>
  (await sectionTitled('Klok').getByText('Analoge klok').count()) === 0
);
await check('the menu reveals them', async () => {
  await openWidgetSettings('Klok');
  return sectionTitled('Klok').getByText('Analoge klok').isVisible();
});
await check('and hides them again', async () => {
  await openWidgetSettings('Klok');
  return (await sectionTitled('Klok').getByText('Analoge klok').count()) === 0;
});
await check('a bookmark category carries a plus by its title', async () => {
  const plus = sectionTitled('Favorieten').getByRole('button', { name: /Bookmark toevoegen/ });
  return (await plus.count()) === 1;
});
await check('the plus opens the add dialog', async () => {
  await sectionTitled('Favorieten')
    .getByRole('button', { name: /Bookmark toevoegen/ })
    .first()
    .click();
  await page.waitForTimeout(350);
  const open = await page.getByRole('dialog').isVisible();
  await page.keyboard.press('Escape');
  await page.waitForTimeout(250);
  return open;
});
await check('every bookmark row shows an icon', async () => {
  const rows = await sectionTitled('Favorieten').locator('li a').count();
  const icons = await sectionTitled('Favorieten').locator('li a img, li a span[aria-hidden]').count();
  return rows > 0 && icons >= rows ? `${icons} icons for ${rows} links` : false;
});

console.log('— widget library —');
await page.locator('button:has-text("Widget toevoegen")').first().click();
await page.waitForTimeout(400);
await check('library opens', () => page.getByRole('dialog').isVisible());
await check('library lists widgets', async () => {
  const n = await page.getByRole('dialog').locator('li button').count();
  return n >= 6 ? `${n} cards` : false;
});
await page.getByRole('dialog').locator('input').first().fill('weer');
await page.waitForTimeout(250);
await check('library search narrows down', async () => {
  const n = await page.getByRole('dialog').locator('li button').count();
  return n >= 1 && n <= 3 ? `${n} result(s)` : false;
});
await shot('02-library');
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

console.log('— theme and language —');
await page.keyboard.press(',');
await page.waitForTimeout(400);
await page.getByRole('dialog').getByRole('button', { name: /Weergave/ }).click();
await page.getByRole('dialog').getByRole('radio', { name: 'Donker' }).click();
await page.waitForTimeout(350);
await check('dark theme applies', async () => (await page.getAttribute('html', 'data-theme')) === 'dark');
await shot('03-dark');

await page.getByRole('dialog').getByRole('button', { name: /Algemeen/ }).click();
await page.getByRole('dialog').locator('select').first().selectOption('ja');
await page.waitForTimeout(900);
await check('Japanese loads on demand', async () => {
  const title = await page.getByRole('dialog').locator('h2').first().innerText();
  return (await page.getAttribute('html', 'lang')) === 'ja' && title.includes('設定') ? title : false;
});
await shot('04-japanese');

await page.getByRole('dialog').locator('select').first().selectOption('ar');
await page.waitForTimeout(900);
await check('Arabic flips the page to RTL', async () => (await page.getAttribute('html', 'dir')) === 'rtl');
await shot('05-arabic');

await page.getByRole('dialog').locator('select').first().selectOption('nl');
await page.waitForTimeout(800);
await page.getByRole('dialog').getByRole('button', { name: /Weergave/ }).click();
await page.getByRole('dialog').getByRole('radio', { name: 'Licht' }).click();
await page.waitForTimeout(300);
await page.keyboard.press('Escape');
await page.waitForTimeout(300);

console.log('— editing —');
await page.locator('input[placeholder*="Nieuwe taak"]').first().fill('Smoke test taak');
await page.keyboard.press('Enter');
await page.waitForTimeout(400);
await check('task added', () => page.locator('input[value="Smoke test taak"]').isVisible());

const notes = page.locator('textarea').first();
await notes.click();
await notes.fill('Notitie uit de smoke test');
await page.waitForTimeout(700);
await check('note reaches the store', () =>
  page.evaluate(() =>
    JSON.stringify(JSON.parse(localStorage.getItem('myarcana-store')).state.pages)
      .includes('Notitie uit de smoke test')
  )
);

console.log('— drag and drop —');
const before = await activePage();
await dragTo(
  sectionTitled('Sociaal').locator('.drag-handle').first(),
  sectionTitled('Notities')
);
const after = await activePage();
await check('widget moved to another column', () => {
  const col0 = after.columns[0].widgets.map((w) => w.title);
  const col1 = after.columns[1].widgets.map((w) => w.title);
  return !col0.includes('Sociaal') && col1.includes('Sociaal');
});
await check('no widget lost in the move', () => {
  const count = (p) => p.columns.reduce((n, c) => n + c.widgets.length, 0);
  return count(before) === count(after) ? `${count(after)} widgets` : false;
});

const favourites = () =>
  activePage().then((p) =>
    p.columns.flatMap((c) => c.widgets).find((w) => w.title === 'Favorieten')
      .config.bookmarks.map((b) => b.title)
  );
const orderBefore = await favourites();
const rows = sectionTitled('Favorieten').locator('.group\\/row');
await rows.first().hover();
await dragTo(rows.first().locator('.drag-handle').first(), rows.nth(3), 12);
const orderAfter = await favourites();
await check('bookmark reordered', () => orderAfter.join() !== orderBefore.join());
await check('no bookmark lost', () =>
  orderAfter.length === orderBefore.length ? `${orderAfter.length} links` : false
);
await shot('06-after-drag');

await page.keyboard.press('Control+z');
await page.waitForTimeout(500);
await check('undo restores the order', async () => (await favourites()).join() === orderBefore.join());

console.log('— importing browser bookmarks —');
await page.keyboard.press(',');
await page.waitForTimeout(400);
await page.getByRole('dialog').getByRole('button', { name: /^Data$/ }).click();
await page.getByRole('dialog').locator('input[type=file]').setInputFiles(bookmarksFile);
await page.waitForTimeout(900);
await check('import reports a count', async () => {
  const m = /(\d+)\s+bookmarks geïmporteerd/.exec(await page.getByRole('dialog').innerText());
  return m ? `${m[1]} bookmarks` : false;
});
await shot('07-import');
await page.keyboard.press('Escape');
await page.waitForTimeout(400);

const imported = (await state()).pages.at(-1);
const importedWidgets = imported.columns.flatMap((c) => c.widgets);
await check('folders became widgets', () => {
  const titles = importedWidgets.map((w) => w.title);
  return titles.includes('Bookmarks bar') && titles.includes('Recepten');
});
await check('nested folder kept its children', () => {
  const sub = importedWidgets
    .find((w) => w.title === 'Bookmarks bar')
    ?.config.bookmarks.find((b) => b.kind === 'folder' && b.title === 'Werk');
  return sub?.children.length === 2 ? `Werk (${sub.children.length})` : false;
});
await check('javascript: bookmarklet skipped', () => !JSON.stringify(imported).includes('javascript:'));
await check('loose links grouped together', () =>
  importedWidgets.some((w) => w.title === 'Bookmarks')
);

console.log('— share link —');
await page.locator('header button', { hasText: /^Start$/ }).first().click();
await page.waitForTimeout(300);
const startTab = page.locator('header .group\\/tab').filter({ hasText: 'Start' }).first();
await startTab.hover();
await page.waitForTimeout(200);
// The gear only fades in on hover, so click past the opacity transition.
await startTab.locator('button[aria-label="Pagina-instellingen"]').first().click({ force: true });
await page.getByRole('menuitem', { name: /Deelbare link maken/ }).click();
await page.waitForTimeout(1200);
const shareUrl = await page.getByRole('dialog').locator('input[readonly]').inputValue();
await check('share link produced', () =>
  shareUrl.includes('#share=') ? `${(shareUrl.length / 1024).toFixed(1)} kB` : false
);
await page.keyboard.press('Escape');

const viewer = await browser.newPage({ viewport: { width: 1280, height: 900 }, locale: 'nl-NL' });
viewer.on('pageerror', (e) => problems.push(`viewer: ${e.message}`));
await viewer.goto(shareUrl, { waitUntil: 'domcontentloaded' });
await viewer.waitForTimeout(2000);
await check('shared page announces itself', () =>
  viewer.getByText('Je bekijkt een gedeelde pagina').isVisible()
);
await check('shared page renders its widgets', async () => {
  const n = await viewer.locator('main section').count();
  return n >= 4 ? `${n} widgets` : false;
});
await check('shared page is read-only', async () =>
  (await viewer.locator('button:has-text("Widget toevoegen")').count()) === 0
);
if (SHOTS) await viewer.screenshot({ path: join(SHOTS, '08-shared.png') });
await viewer.close();

console.log('— calculator —');
await page.locator('button:has-text("Widget toevoegen")').first().click();
await page.waitForTimeout(400);
await page.getByRole('dialog').locator('input').first().fill('rekenmachine');
await page.waitForTimeout(300);
await page.getByRole('dialog').locator('li button').first().click();
await page.waitForTimeout(500);
const calc = sectionTitled('Rekenmachine');
const compute = async (expression) => {
  await calc.locator('input').nth(1).fill(expression);
  await page.waitForTimeout(350);
  return calc.innerText();
};
await check('respects operator precedence', async () =>
  (await compute('2 + 3 * (4 - 1) ^ 2')).includes('29') ? '2 + 3 * (4-1)^2 = 29' : false
);
await check('handles functions and modulo', async () =>
  (await compute('sqrt(144) + 10 % 3')).includes('13') ? 'sqrt(144) + 10%3 = 13' : false
);
await check('stays quiet on nonsense', async () => !/=\s*\d/.test(await compute('2 +* 3')));

console.log('— templates —');
await page.keyboard.press('Escape');
await page.locator('header button[aria-label="Pagina toevoegen"]').first().click();
await page.waitForTimeout(300);
await page.getByRole('menuitem', { name: /Sjablonen/ }).click();
await page.waitForTimeout(400);
await check('templates listed', async () => {
  const n = await page.getByRole('dialog').locator('li button').count();
  return n >= 6 ? `${n} templates` : false;
});
await page.getByRole('dialog').locator('li button').filter({ hasText: 'Ontwikkelaar' }).first().click();
await page.waitForTimeout(600);
await check('template creates its page', async () => (await activePage()).title === 'Ontwikkelaar');
await shot('09-template');

console.log('— persistence and mobile —');
await page.reload({ waitUntil: 'domcontentloaded' });
await page.waitForTimeout(1200);
await check('active page survives a reload', async () => (await activePage()).title === 'Ontwikkelaar');
await check('edits survive a reload', async () =>
  JSON.stringify((await state()).pages).includes('Smoke test taak')
);

const mobile = await browser.newPage({
  viewport: { width: 390, height: 844 },
  locale: 'nl-NL',
  isMobile: true,
  hasTouch: true,
});
await mobile.goto(BASE, { waitUntil: 'domcontentloaded' });
await mobile.waitForTimeout(1600);
await check('the page itself does not scroll sideways at 390px', () =>
  mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)
);
const track = mobile.locator('main .no-scrollbar').first();
await check('columns sit in one swipeable row', async () => {
  const m = await track.evaluate((el) => ({
    columns: el.children.length,
    scrollable: el.scrollWidth > el.clientWidth + 10,
    firstWidth: (el.firstElementChild).getBoundingClientRect().width,
    viewport: el.clientWidth,
  }));
  if (!m.scrollable || m.columns < 2) return false;
  // A column takes most of the viewport, leaving the next one peeking in.
  const share = m.firstWidth / m.viewport;
  return share > 0.7 && share < 0.95 ? `${m.columns} columns, ${Math.round(share * 100)}% each` : false;
});
await check('swiping moves to the next column', async () => {
  const before = await track.evaluate((el) => el.scrollLeft);
  await track.evaluate((el) => el.scrollBy({ left: el.clientWidth * 0.86 }));
  await mobile.waitForTimeout(500);
  const after = await track.evaluate((el) => el.scrollLeft);
  return after > before ? `${Math.round(before)} → ${Math.round(after)}px` : false;
});
if (SHOTS) await mobile.screenshot({ path: join(SHOTS, '10-mobile.png') });
await mobile.close();

await browser.close();

console.log(`\n${checks - problems.length}/${checks} checks passed`);
if (problems.length) {
  console.log('\nproblems:');
  problems.forEach((p) => console.log(' •', p));
  process.exit(1);
}
