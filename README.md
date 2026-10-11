# myArcana

Jouw persoonlijke startpagina: alle bookmarks, nieuws, notities en widgets op
één plek — in het Nederlands en twintig andere talen.

myArcana draait volledig in de browser. Er is geen account nodig en je data
wordt nergens naartoe gestuurd: alles staat in `localStorage` van het apparaat
waarop je werkt, en je kunt er op elk moment een back-up van maken.

## Wat het kan

**Pagina's en indeling**
- Meerdere startpagina's met tabs, eigen naam, emoji-pictogram en volgorde
- 1 tot 7 kolommen per pagina, elk met een instelbare breedte
- Widgets slepen binnen een kolom en tussen kolommen
- Ongedaan maken / opnieuw (40 stappen diep)
- Bewerkmodus aan/uit, zodat de pagina in dagelijks gebruik rustig blijft

**Widgets (20 soorten)**

| | |
|---|---|
| Bookmarks | lijst, tegels, pictogrammen of compact; mappen, favicons, eigen kleuren, sorteren op titel/datum/bezoeken, meerdere links tegelijk plakken |
| Notities | kladblok dat tijdens het typen opslaat |
| Takenlijst | afvinken, deadline, prioriteit, afgeronde taken verbergen of wissen |
| Nieuws (RSS) | elke RSS- of Atom-feed, met afbeeldingen, datums en samenvattingen |
| Weer | actueel weer en meerdaagse verwachting (Open-Meteo, zonder sleutel) |
| Klok | digitaal of analoog, met datum en 12/24-uursnotatie |
| Wereldklok | meerdere tijdzones naast elkaar, met tijdsverschil |
| Kalender | maandweergave met ISO-weeknummers |
| Aftellen | dagen, uren, minuten en seconden tot een moment |
| Zoekbalk | losse zoekbalk midden op de pagina |
| Insluiten | elke site of video in een iframe (YouTube, Vimeo, Spotify en Maps worden automatisch omgezet) |
| Afbeelding | één afbeelding, met bijschrift en link |
| Galerij | diavoorstelling met instelbaar interval |
| Rekenmachine | eigen parser (geen `eval`), met functies, machten en geschiedenis |
| Valuta | live wisselkoersen |
| Aandelen | koersen van je eigen tickers |
| Diagram | staaf-, lijn- of ringdiagram |
| Kop, Citaat, Rijke tekst | om een kolom in te delen |

**Zoeken**
- 28 zoekmachines, per zoekbalk instelbaar
- `!bang`-prefixen: `!yt kat` zoekt direct op YouTube, `!w` op Wikipedia
- Een getypt adres opent direct de site in plaats van te zoeken
- Zoekt tegelijk in je eigen bookmarks, over alle pagina's heen

**Weergave**
- Licht, donker of meebewegen met het systeem
- 14 accentkleuren plus een eigen kleurkiezer
- Achtergrond: effen kleur, verloop, of een achtergrondfoto — met vervaging en verdonkering
- Per pagina een eigen achtergrond
- Instelbare breedte, kolomafstand, tekstgrootte, hoekafronding en doorzichtigheid

**Data**
- Export als JSON (volledige back-up) of als HTML-bookmarkbestand
- Import van een myArcana-back-up of van bookmarks uit Chrome, Firefox, Edge en Safari — inclusief geneste mappen
- Deellink: een hele pagina wordt gecomprimeerd in de URL-fragment, dus zonder server
- Zeven kant-en-klare sjablonen

**Talen**

Nederlands plus de twintig meest gesproken talen ter wereld, alle 438
tekstregels vertaald:

🇳🇱 Nederlands · 🇬🇧 English · 🇨🇳 中文 · 🇮🇳 हिन्दी · 🇪🇸 Español · 🇸🇦 العربية ·
🇫🇷 Français · 🇧🇩 বাংলা · 🇵🇹 Português · 🇷🇺 Русский · 🇵🇰 اردو ·
🇮🇩 Bahasa Indonesia · 🇩🇪 Deutsch · 🇯🇵 日本語 · 🇮🇳 मराठी · 🇮🇳 తెలుగు ·
🇹🇷 Türkçe · 🇱🇰 தமிழ் · 🇻🇳 Tiếng Việt · 🇰🇷 한국어 · 🇮🇹 Italiano

Arabisch en Urdu worden van rechts naar links weergegeven. De taal van de
browser wordt bij het eerste bezoek automatisch gekozen.

**Sneltoetsen**

`/` zoeken · `,` instellingen · `e` bewerkmodus · `?` sneltoetsen ·
`1`–`9` naar pagina · `←` `→` vorige/volgende pagina ·
`Ctrl/⌘ Z` ongedaan maken · `Ctrl/⌘ ⇧ Z` opnieuw

## Lokaal draaien

```bash
npm install
npm run dev        # http://127.0.0.1:5173
```

```bash
npm run build          # typecheck + productiebuild in dist/
npm run preview        # bekijk de productiebuild
npm run typecheck      # alleen de typecheck
npm run check:locales  # controleert of alle 21 talen dezelfde sleutels hebben
```

### Smoke test

`scripts/smoke.mjs` stuurt een echte browser langs 38 controles: renderen,
vertalen, slepen, importeren, delen, rekenen en opslaan.

```bash
npx playwright install chromium   # eenmalig
npm run build && npm run preview &
npm run smoke                     # SHOTS=./shots voor screenshots
```

## Online zetten

De build is volledig statisch: `dist/` kan op elke webserver, CDN of
static-host.

**GitHub Pages** — de workflow in `.github/workflows/deploy.yml` bouwt en
publiceert bij elke push naar `main`. Zet Pages eerst één keer aan:
**Settings → Pages → Build and deployment → Source: GitHub Actions**. Dat kan
alleen een mens doen; de workflow-token mag de Pages-site niet zelf aanmaken.
Daarna zet de workflow `VITE_BASE` automatisch op de naam van de repository,
zodat de site ook onder een subpad werkt.

**Hostinger of een andere host** — bouw voor de domeinroot en upload de inhoud
van `dist/` naar `public_html`:

```bash
npm ci && npm run build
```

**Een subpad** — zet `VITE_BASE` op het pad waar de site komt te staan:

```bash
VITE_BASE=/startpagina/ npm run build
```

## Vormgeving

De maatvoering is niet op gevoel gekozen. `docs/reference-measurements.md`
bevat de opgemeten waarden — kleuren bemonsterd per pixel, rijhoogtes,
kolombreedtes en de geometrie van de mobiele carrousel — met per getal de
ruwe pixelwaarde waar het uit volgt. De tokens in `src/index.css` en de
klassen in `WidgetFrame`, `BookmarksWidget`, `Column` en `PageGrid` volgen
die tabel.

Kort samengevat: de kaart is een vlak neutraal grijs dat *donkerder* is dan
de pagina, die zelf een blauwgrijs verloop heeft. Rijen zijn 24px op een
telefoon en 19px op een desktop, met op beide een favicon van 16px — alleen
de letters en de rijhoogte schalen mee, de iconen niet. Op een telefoon is
elke kolom 90vw breed, snapt hij in het midden, piepen de buren er 10px in
en scrollt elke kolom verticaal op zichzelf.

## Hoe het in elkaar zit

```
src/
├─ components/
│  ├─ layout/     Header, paginatabs, kolommen, raster, zoekbalk
│  ├─ widgets/    De 20 widgets plus het frame en de widgetcatalogus
│  ├─ modals/     Widgetbibliotheek, instellingen, sjablonen, delen
│  └─ ui/         Modal, menu, formulierelementen, favicon
├─ store/         Datamodel en de zustand-store met localStorage
├─ lib/           Thema, zoekmachines, RSS, weer, koersen, import/export
└─ i18n/          i18next plus 21 vertalingsbestanden
```

Nederlands en Engels zitten in de hoofdbundel; de andere negentien talen
worden pas opgehaald zodra iemand ze kiest.

### Externe diensten

Alles wat live data toont, gebruikt een dienst zonder API-sleutel, zodat de
site voor iedereen werkt zonder configuratie:

| Widget | Dienst | Opmerking |
|---|---|---|
| Weer | Open-Meteo | CORS-vrij, geen sleutel |
| Valuta | Frankfurter, met een tweede bron als terugval | geen sleutel |
| Nieuws | rss2json, AllOrigins of corsproxy | feeds staan zelf zelden CORS toe |
| Aandelen | Yahoo Finance via een relay | kan uitvallen; de widget zegt het dan |
| Favicons | Google S2, met DuckDuckGo als terugval | valt terug op initialen |

Elke widget blijft werken als zo'n dienst niet bereikbaar is: je ziet dan een
nette melding in plaats van een lege widget.

## Wat er nog niet in zit

Bewust voor later bewaard, omdat er een server voor nodig is:

- Accounts en synchronisatie tussen apparaten
- Samen bewerken en gedeelde teampagina's (delen kan nu alleen via een link)
- Een browserextensie die myArcana als nieuw-tabblad instelt
- Google Agenda, Google Taken en Trello (vragen OAuth)
- Live aandelenkoersen met een eigen API-sleutel

Deelbare pagina's werken nu via de URL-fragment en zijn daarmee beperkt tot
ongeveer 30 kB per pagina; een typische pagina blijft rond de 2 kB.
