<!--
  Measurements taken from screenshots of the reference start page, used to
  size myArcana's own layout. Pixel values were sampled with PIL and
  converted to CSS px via the device scale factor; every number carries the
  raw value it came from so it can be re-derived.

  Numbers only: spacing, colour and proportion. No artwork, wordmarks or
  copy were taken from the reference.
-->

# start.me visual specification (from three screenshots)

Measured from the three supplied screenshots of the start.me page **OSINT4ALL** (dark
theme). Every number below is either **measured** (pixel-sampled with PIL) or
**estimated** — estimates are always labelled and given a range.

This document is a target spec for the React/Tailwind rebuild at
`/home/user/MyArcana-Startpagina`. Nothing in that repo was modified.

---

## 0. Measurement basis — how raw pixels were converted to CSS px

All three screenshots are 1320 x 2868 raw pixels.

### Mobile (screenshots 2 and 3) — scale factor **exactly 3.0**
1320 x 2868 at DPR 3 is an iPhone 16 Pro Max: a **440 x 956 CSS-px viewport**.
2868 / 3 = 956 exactly, which confirms it. So *raw px / 3 = CSS px*. High confidence.

### Desktop (screenshot 1) — scale factor **≈ 2.35 raw px per CSS px** (range 2.25–2.45)
The browser window is a crop inside a vertical video, so there is no direct viewport
size. Three independent anchors agree:

| anchor | raw px | known CSS size | implied scale |
|---|---|---|---|
| Chrome tab favicon (blue start.me square) | 37.5 | 16 | 2.34 |
| Chrome chrome height (window top 538 → page top 731) | 193 | ~82 (40 tabstrip + 40 toolbar + border) | 2.35 |
| start.me link-row favicons | 37–40 | 16 | 2.34–2.50 |

**Use 2.35.** Every desktop CSS number below carries roughly ±5% uncertainty from this.
Raw-pixel values are given in brackets so you can re-derive with a different factor.

---

## 1. Colour

### 1.1 The single most important fact

**start.me's widget cards are DARKER than the page behind them, and the page is a
mid-tone blue-grey, not black.** The current build has this inverted and flattened.

| | page background | card background | contrast ratio |
|---|---|---|---|
| start.me desktop (mid-page) | `#67737C` | `#454749` | **1.92 : 1** |
| start.me mobile (mid-page) | `#576674` | `#46494B` | **1.54 : 1** |
| start.me mobile (top of page) | `#414C57` | `#434547` | 1.10 : 1 |
| **current build, dark** | `#14151A` | `#1F2129` | **1.14 : 1** (card *lighter*) |

The cards read clearly on start.me because the page behind them is a light-ish
desaturated slate, and because card and page are *different hues* (neutral grey card
on a blue-grey page), not because of a big luminance step.

### 1.2 Page background — a vertical gradient, sampled every 100 raw px

Mobile (screenshot 2, sampled in the 12 px gutter at raw x = 48):

| raw y | hex | | raw y | hex |
|---|---|---|---|---|
| 500 | `#3D4750` | | 1700 | `#576674` |
| 900 | `#404C56` | | 2100 | `#5B6B79` |
| 1300 | `#4F5D6A` | | 2600 | `#607181` |

Desktop (screenshot 1, gutter at raw x = 420; this page is scrolled, so it shows a
lower slice of the same kind of gradient):

| raw y | hex | | raw y | hex |
|---|---|---|---|---|
| 880 | `#616D77` | | 1600 | `#6C7781` |
| 1240 | `#66717B` | | 1960 | `#747E86` |

**Implementation:** a page-level vertical gradient
`linear-gradient(180deg, #3C4750 0%, #607181 100%)` over ~800 px, or a flat
**`#525E6A`** if you want one token. Either way it is a *mid-tone desaturated slate*,
roughly `hsl(205 14% 35%)` → `hsl(205 16% 44%)`.

### 1.3 Card background

| | sampled values | flat value to use |
|---|---|---|
| mobile, top of viewport | `#434547` | |
| mobile, bottom of viewport | `#474A4C` | |
| desktop, top of viewport | `#444647` | |
| desktop, bottom of viewport | `#47484A` | |
| **both** | | **`#454749`** |

The card tracks the page gradient by about 2/9 of the page's own change, so the real
card is **semi-transparent**: approximately `rgba(65, 65, 64, 0.78)` over the page, i.e.
a neutral near-`#414141` at ~78% opacity. A flat `#454749` is visually
indistinguishable and much simpler. **Mobile and desktop card colours are the same.**

### 1.4 Text

| element | measured hex | notes |
|---|---|---|
| widget title | **`#E8E8E8`** | flat across the stem of the `U` in "UNIFIED SEARCH", mobile PNG — so it really is dimmed, not antialiasing |
| link row label | **`#FFFFFF`** | flat across the stem of the `I` in "IOA" |
| card header `...` glyph | **`#C7C7C8`** | ~78% white |
| desktop equivalents | same within compression noise | desktop screenshot is video-compressed; trust the mobile values |

Note the inversion vs. most design systems: the **title is dimmer than the body rows**.
Title `#E8E8E8` (9.1:1 on card), rows `#FFFFFF` (9.9:1 on card).

### 1.5 Top bar

| | desktop | mobile |
|---|---|---|
| bar background | `#1C2022` (core `#191C1D`, edges `#202325`) | `#313C48` / `#313D48` |
| bar height | 106 raw = **45 CSS** | 155 raw = **52 CSS** |
| control chip fill | `#202428` (⋮ circle), `#1D2225` (search field) | `#555E68` → `#58606B` |
| white CTA / active-tab pill | `#FFFFFF` fill, dark text | — (not present on mobile) |
| avatar circle | (cut off in crop) | `#A59BC6` fill, `#2A1F4D` initials |

The mobile bar is clearly **translucent**: `#313C48` is approximately `#1C2022` at 30%
over the page gradient. The mobile chip fill `#555E68` is approximately
`rgba(255,255,255,0.13)` over the bar.

### 1.6 Borders, dividers, shadows

**There are none.** No card border, no header rule, no row separators, no column
dividers. The only edge treatment is a soft card drop shadow: the desktop card's right
edge fades over about 4 raw px (~2 CSS px) into the page. Something like
`box-shadow: 0 1px 3px rgba(0,0,0,0.25)`.

### 1.7 Hover / selected states visible in the screenshots

* **No link-row hover is visible.** In screenshot 1 the cursor sits on the *title* of
  the SOCIAL MEDIA card; the card background under it is unchanged, and no row anywhere
  shows a highlight. So either there is no row hover, or it is subtle enough not to
  appear. Recommendation: `rgba(255,255,255,0.06)` row hover, radius 3 px.
* **One selected state is visible:** the desktop page tab `OSINT4ALL` is a **solid white
  rounded rect with dark text**, i.e. an inverted pill, not a tinted one.
* **Scroll indicators** (iOS native, screenshots 2/3): thumb `#717374` vertical,
  `#77797B` horizontal, **9 raw = 3 CSS px** thick, inset 9 raw = 3 CSS from the edge.
  These are the OS default, not custom CSS.

---

## 2. Widget cards

All CSS px. Raw pixel values in brackets.

| property | desktop | mobile |
|---|---|---|
| card width | **194** [457] (range 190–200) | **396** [1188] = exactly **90vw** |
| column pitch (card + gutter) | **207** [486] | **408** [1224] |
| gutter between columns | **12** [29] (range 11–14) | **12** [36] |
| vertical gap between cards in a column | **12** [29] | **12** [36] |
| corner radius | **2–3** [5–7] — nearly square *(estimate; video compression softens the corner)* | **8** [24–26] (range 8–9) |
| padding-inline | **8–10** [19–24] | **12** [36] |
| padding-top (card top → title cap top) | 16 [38]; minus half-leading ⇒ padding ≈ **10–12** | 18 [55]; minus half-leading ⇒ padding ≈ **14** |
| title cap bottom → first row box top | **14** [33] | **18** [54] |
| card height example | 343 [805] for header + 15 rows | 374 [1122] for header + 13 rows |

### 2.1 The title

| property | desktop | mobile |
|---|---|---|
| capitalisation | ALL CAPS | ALL CAPS |
| cap height measured | 26 raw = 11.1 CSS | 36 raw = 12.0 CSS |
| implied font-size (cap/em ≈ 0.727) | **15** (range 14–16) | **16.5** (range 16–17) |
| font-weight | **700** | **700** |
| letter-spacing | **≈ 0**, at most +0.02em — the glyphs are tight, *not* tracked out | same |
| colour | `#E8E8E8` | `#E8E8E8` |

### 2.2 Card header contents — **critically, there is no `+`**

Verified at 2x zoom on both the desktop SOCIAL MEDIA header and the mobile UNIFIED
SEARCH header. The header contains **exactly two things**:

1. the uppercase title, flush to the card's left padding;
2. a **`...` (three horizontal dots)**, flush right, vertically centred on the title.

There is **no `+`**, no collapse chevron, no drag handle, no settings cog, no count
badge, no icon beside the title. The header has **the same background as the card body**
— no fill, no tint, no accent band, no divider rule under it.

`...` geometry:

| | desktop | mobile |
|---|---|---|
| glyph width (3 dots, outer edge to outer edge) | **10** [24] | **11** [32] |
| dot diameter | **2.5** [6] | **2.7** [8] |
| right edge of glyph → card right edge | **17** [40] | **22** [66] |
| vertical centre | on the title cap's centre (within 1 px) | same |

(Implied hit target: roughly a 24 CSS square on desktop, a 44 CSS square on mobile,
whose right edge sits ~10 / ~4 CSS from the card edge.)

---

## 3. Link rows

| property | desktop | mobile |
|---|---|---|
| row pitch (centre to centre) | **19** [45.3] (range 18–20) | **24** [72] — exact, measured over 11 consecutive rows |
| favicon box | **16 x 16** [37–40] | **16 x 16** [48 x 48] — exact |
| favicon corner radius | none applied; favicons render at their natural shape (some square, some circular). Use 0–2 px. | same |
| gap favicon → label | **5–6** [12–14] | **7** [20] |
| label font-size | **12** (range 12–13); cap height 21 raw | **15** (range 14–16); cap height 31 raw |
| label font-weight | 400 | 400 |
| label colour | `#FFFFFF` | `#FFFFFF` |
| favicon left edge → card left edge | **8** [19] | **12** [36] |
| row background | none | none |
| row dividers | none | none |

### Overflow handling

**Single line, `white-space: nowrap`, `text-overflow: ellipsis`.** Confirmed in the
middle column of screenshot 1:

* `Instagram, Reddit & Snapc…`
* `Google to search profiles o…`
* `Facebook Scraped Data se…`
* `Facebook Photo Search En…`

A caveat on the brief: the clipped labels in the **right-hand** column of screenshot 1
(`Background Removal Tool`, `License Plates of the Worl`) are clipped by the **video
frame**, not by the card — that column's card starts at raw x = 928 and its right edge
(928 + 457 = 1385) is past the 1320-px image edge. Do not infer hard clipping from them.
The real behaviour is the ellipsis seen in the middle column.

---

## 4. Desktop layout

* **Columns:** at least 3 fully visible in the crop; the window is wider than the crop
  so the true count is unknown. Columns are **narrow and fixed-ish at ~194 CSS px**,
  pitch 207. On a 1920-px window that is roughly 9 columns.
* **Scrolling:** the **whole page scrolls vertically** — all three visible columns are
  cut off at the same top edge, each mid-card, and no per-column scrollbar appears
  anywhere in the viewport. There are no independent column scrollers on desktop.
  (Whether the board also scrolls horizontally could not be confirmed: the light bar at
  the very bottom of the crop is as likely to be the YouTube progress bar as a
  scrollbar. But fixed 194-px columns strongly imply horizontal overflow rather than
  flex-squeezing.)
* **Top bar**, 45 CSS tall, `#1C2022`, no bottom border, left → right:

  | # | element | size (CSS) | notes |
  |---|---|---|---|
  | 1 | workspace pill: circular avatar + `socmint` + `⌄` | h ≈ 32 | no visible chip fill; sits directly on the bar; starts ~8–10 from the window's left edge |
  | 2 | page tab `OSINT4ALL` | **71 x 32**, radius ~4 | **solid white fill, dark text** = the active page. Only one tab visible. |
  | 3 | — | flexible gap | |
  | 4 | `⋮` icon button | **28** diameter circle, fill `#202428` | |
  | 5 | search field | **129 x 27**, radius ~13 (pill), fill `#1D2225` | magnifier icon + placeholder `Bookmarks` in light grey, ~13 px |
  | 6 | `Start for free` | **87 x 32**, radius 999 | solid white, dark text |

  Controls 4–6 are grouped to the right; 1–2 are grouped left, with a large flexible
  space between.

---

## 5. Mobile layout — the part the current build gets most wrong

Viewport: **440 x 956 CSS px** (iPhone 16 Pro Max, DPR 3).

### 5.1 The column carousel — exact geometry

Measured on screenshot 2 (at rest), horizontal scan at raw y = 1290:

```
raw x:   0 ──── 30 ──── 66 ──────────────────── 1254 ─── 1290 ─── 1320
        left-peek   gutter      ACTIVE COLUMN       gutter   right-peek
          card                                               card
         [30 raw]   [36 raw]      [1188 raw]       [36 raw]  [30 raw]
CSS:     10 px      12 px          396 px           12 px     10 px
```

So, in CSS px on a 440-px viewport:

| property | value |
|---|---|
| column width | **396 = exactly 90vw** |
| gap between columns | **12** |
| scroll-container `padding-inline` | **22 = exactly 5vw** |
| column pitch | **408** |
| **left peek of the previous column** | **10** |
| **right peek of the next column** | **10** |
| snapping | **`scroll-snap-type: x mandatory`** on the track, **`scroll-snap-align: center`** on each column |

`scroll-snap-align: start` with `scroll-padding-inline: 22px` produces an identical
resting position here, so the two cannot be distinguished from the screenshots — but
`center` is the safer choice because it also yields symmetric 10-px peeks on the first
and last columns.

### 5.2 Proof that it is a real scroll container, not a transform carousel

Screenshot 3 is the same page mid-swipe. The same column whose right edge is at raw
x = 1254 at rest sits at raw x = 836 mid-swipe — the content has moved **418 raw px =
139 CSS px = 34% of one 408-px pitch**. The incoming column's left edge is at raw 872,
preserving the 36-raw (12-CSS) gutter exactly. Both columns are drawn simultaneously
and at the correct relative offset. That is free, momentum-driven scrolling between
snap points inside **one** `overflow-x: auto` track holding all columns in a row.

### 5.3 Each column scrolls vertically on its own

In screenshot 2 iOS draws a vertical scroll indicator **inside the active column**:

* thumb at raw x 1236–1245 → **3 CSS px wide**, **3 CSS px inset from the card's right
  edge** (card right edge is raw 1254),
* thumb top at raw 597, i.e. 3 CSS below the card's top edge (raw 588),
* thumb length 182 raw = **61 CSS px**.

If the page as a whole were the vertical scroller, that indicator would sit at the
**viewport's** right edge (raw ≈ 1311), not 18 raw px inside the card. So each column is
its own vertical scroller — roughly
`height: calc(100dvh - 52px); overflow-y: auto; overscroll-behavior: contain`.

In screenshot 3 (mid-swipe) iOS additionally shows the **horizontal** indicator: thumb
at raw y 2616–2625 (**3 CSS tall, 3 CSS above the scroll area's bottom**), raw x
435–783 (**116 CSS long**). Thumb/track ≈ 26%, so the track is about 3.8 viewports wide
— roughly **4 columns** on this page.

### 5.4 The `❯` chevron

| property | measured |
|---|---|
| glyph bounding box | raw x 23–48, y 684–763 → **8.7 x 26.7 CSS px** |
| stroke weight | ~4 raw = **1.3 CSS** |
| colour | **`#CACCD5`** |
| horizontal position | centred **~12 CSS from the viewport's left edge** (bleeds to x = 0) |
| vertical position | centre **129 CSS from the top of the web viewport** = **77 CSS below the sticky header** = **45 CSS below the first card's top edge** |
| background | **no pill, no tab, no button chrome.** Only a very faint dark halo: max −8/255 ≈ 3% black at the glyph, fading to 0 by ~150 CSS to the right and ~90 CSS above/below. Reproduce with `text-shadow: 0 0 24px rgba(0,0,0,.45)` or a soft radial scrim. |
| when visible | **at rest**, on an interior column (screenshot 2 is at rest and shows both peeks, so it is not the first column) |
| counterpart on the right edge | **none.** A scan of raw x 1250–1320, y 560–1000 in screenshot 2 finds **zero** bright glyph pixels. |

Because it points **right** while sitting on the **left** edge and has no mirror on the
right, this is almost certainly the handle that slides start.me's left sidebar out — not
a "next column" arrow. Do not build it as a pair of carousel arrows.

### 5.5 Mobile top bar

52 CSS tall, `#313C48` (translucent), `padding-inline: 7`, all controls **36 CSS tall**
with radius ~8–10 and fill `#555E68` (≈ `rgba(255,255,255,0.13)`). Left → right:

| element | size (CSS) | x-range (CSS) |
|---|---|---|
| workspace pill: 26-px avatar circle (10 from the pill's left) + bold white `socmint` ~17 px + `⌄` | **125 x 36** | 7 – 132 |
| flexible gap | 98 | 132 – 230 |
| `⋮` button | **38 x 36** | 230 – 268 |
| gap | 6 | |
| `Search` button: 12-px magnifier + bold white `Search` ~17 px | **111 x 36** | 274 – 385 |
| gap | 7 | |
| account button, person outline icon | **41 x 36** | 392 – 433 |

**Differences from the desktop bar:** no page tabs at all (no `OSINT4ALL` pill), no
`Start for free` CTA, an account button is added, the bar is **7 CSS taller** (52 vs 45),
the controls are **taller** (36 vs 27–32), every control gets a **visible chip fill**
(desktop leaves the workspace pill unfilled), and the bar is **translucent blue-navy**
rather than near-black.

---

## 6. Mobile sizing, collected

| property | mobile | desktop | ratio |
|---|---|---|---|
| link row pitch | **24** | 19 | 1.26 |
| favicon | **16** | 16 | 1.00 |
| widget title font-size | **16–17** | 14–16 | ~1.10 |
| link label font-size | **14–16** (best estimate 15) | 12–13 | ~1.25 |
| card corner radius | **8** | 2–3 | — |
| card padding-inline | **12** | 8–10 | — |
| card horizontal inset from the viewport edge | **22** (= 5vw) | n/a | — |
| column width | **396** (= 90vw) | 194 | — |
| gap (both axes) | **12** | 12 | 1.00 |
| top bar height | **52** | 45 | — |

So: fonts and row heights scale up ~1.25x on mobile, **favicons and gaps do not**.

---

## 7. Ranked list of changes, most visually significant first

Tokens referenced live in `/home/user/MyArcana-Startpagina/src/index.css`
(`:root[data-theme='dark']` block) and `tailwind.config.js`.

1. **Invert and lift the surface scale (dark theme).** Today the page is near-black and
   the card is slightly lighter — 1.14:1, so the cards barely exist. Set:
   * `--c-surface-sunken: 82 94 106` (`#525E6A`) — the page, a mid blue-grey, and ideally
     drive `--bg-layer` with `linear-gradient(180deg,#3C4750,#607181)`;
   * `--c-surface: 69 71 73` (`#454749`) — the card, **darker and more neutral** than the
     page;
   * `--c-surface-raised: 77 79 81` (`#4D4F51`) for menus/popovers;
   * `--c-ink: 255 255 255` (link rows), and give the widget title its own dimmer value
     `#E8E8E8` rather than reusing `--c-ink`;
   * `--c-line`: effectively unused — start.me draws no borders or dividers anywhere.
     Drop `* { @apply border-line }` from showing up on cards.

2. **Stop painting the card header.** `WidgetFrame.tsx` must render the header on the
   plain card background: no accent fill, no tinted band, no `borderTop` hairline in the
   resting state. A widget's chosen colour should at most tint the title text.

3. **Reduce the card header to title + `...` only.** `WidgetFrame.tsx` currently renders
   up to four controls (drag handle, `Plus`, collapse `ChevronDown`, `MoreHorizontal`).
   start.me shows **only** `MoreHorizontal`. Remove the `+` and the collapse chevron from
   the resting header — fold "add bookmark" and "collapse" into the `...` menu, or reveal
   them on hover in edit mode only. (`BookmarksWidget.tsx` registers the `+` through
   `useRegisterAdd`; that wiring can stay, but the button must not sit in the header.)

4. **Fix the mobile carousel numbers.** `PageGrid.tsx` / `Column.tsx` already build a
   snap carousel (`w-[86vw] shrink-0 snap-start` in a `snap-x snap-mandatory`
   `overflow-x-auto` track), so the brief's "`flex-col md:flex-row` vertical stack" no
   longer matches the code — but the geometry is wrong. Change:
   * column `w-[86vw]` → **`w-[90vw]`**;
   * `snap-start` → **`snap-center`**;
   * track `-mx-3 px-3` (12 px) → **`padding-inline: 5vw` (22 px at 440)**, dropping the
     negative margin or matching it;
   * `--col-gap` on mobile → **12 px**;
   * `step()`'s hard-coded `offsetWidth + 16` → `offsetWidth + 12`.

   Result: both neighbours peek exactly **10 px**, which is the signature look.

5. **Tighten desktop density to 19-px rows.** `BookmarksWidget.tsx` uses
   `rowText = 'text-[15px] md:text-[13px]'`, `rowPad = 'py-1.5 md:py-[3px]'`,
   `iconBox = 'h-6 w-6 md:h-4 md:w-4'`. Target desktop: **12 px text, 16 px favicon,
   19 px row pitch** — i.e. `md:text-[12px] md:leading-[19px] md:py-0`, icon stays 16.
   Target mobile: **15 px text, 16 px favicon, 24 px row pitch** — i.e.
   `text-[15px] leading-6 py-0`, and **shrink the mobile icon from `h-6 w-6` (24 px) to
   `h-4 w-4` (16 px)**; the oversized mobile favicon is the second-most obvious mobile
   error after the column geometry.

6. **Make the widget title bigger, bolder-looking and untracked.** Current
   `text-sm ... md:text-[11px] tracking-wider`. Target **desktop 15 px / mobile 16–17 px,
   weight 700, uppercase, `tracking-normal`** (letter-spacing ≈ 0, not `wider`),
   colour `#E8E8E8`.

7. **Narrow the desktop columns.** start.me columns measure **~194 CSS px** wide with a
   **12 px** gutter (pitch 207) — far narrower than the ~350 px the current
   flex-weighted `md:flex-[var(--col-w)_1_0%]` produces at 1500 px. Fixed-ish narrow
   columns are what make start.me look like start.me (and what causes the ellipsis).

8. **Set the gaps to 12 px on both axes.** `Column.tsx` uses `gap-2` (8 px) between
   cards; start.me uses **12 px** vertically and **12 px** between columns, on both
   desktop and mobile.

9. **Give each mobile column its own vertical scroller.** start.me scrolls the column,
   not the page: `height: calc(100dvh - 52px); overflow-y: auto; overscroll-behavior:
   contain` on the mobile column, with the header sticky above it. Desktop keeps page
   scrolling.

10. **Replace the paired chevron tabs with a single bare left-edge chevron.**
    `PageGrid.tsx` draws two `h-12 w-5 bg-ink/25 rounded-e-md` tabs at `top-20` that only
    appear once `edges.left/right` is true. start.me has **one** right-pointing chevron
    on the **left** edge only, **always visible**, **no pill background**, ~9 x 27 px,
    `#CACCD5`, centred ~12 px from the left edge and ~45 px below the column's top.

11. **Card radius: 8 px mobile, 2–3 px desktop.** `--r-widget` is 10 px everywhere.
    Either split it responsively or settle on 6 px as a compromise.

12. **Card padding.** padding-inline **12 px mobile / 8–10 px desktop** (currently
    `px-3 md:px-2.5` on the header and `px-1.5` on rows — the row and header insets do
    not line up). padding-top ~14 mobile / ~11 desktop; 18 mobile / 14 desktop between
    the title and the first row.

13. **Remove every border and divider.** No card border, no header rule, no row
    separators. Keep only a soft `0 1px 3px rgba(0,0,0,0.25)` card shadow.

14. **Top bars.** Mobile: **52 px tall**, translucent `#313C48`, controls **36 px tall**
    with `rgba(255,255,255,0.13)` chips, 7 px side padding, no page tabs. Desktop:
    **45 px tall**, near-black `#1C2022`, the active page tab as a **solid white pill
    with dark text**, and a white pill CTA on the right. `Header.tsx` currently uses
    `bg-surface-raised/95` and 32-px (`h-8 w-8`) controls on both breakpoints.

15. **Row hover.** Not observable in the screenshots; `hover:bg-ink/[0.07]` in the
    current build is a reasonable match for `rgba(255,255,255,0.06)` once `--c-ink`
    becomes white. Leave it, but verify it is not visible at rest.
