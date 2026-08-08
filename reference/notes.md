# Reference capture — thenetworkstate.com

Captured 2026-08-05 via curl (browser User-Agent, no headless browser needed — the
site server-renders via Next.js) against the live site. Structural metadata and
measurements only; no book prose is copied anywhere in this repo.

## Fonts (`fonts/`)

Family `valkyrieFont`, 5 faces (weight/style confirmed from the site's own
`@font-face` CSS, not assumed):

| File | Weight | Style |
| --- | --- | --- |
| `valkyrie-regular.woff2` | 400 | normal |
| `valkyrie-a-regular.woff2` | **600** | normal |
| `valkyrie-bold.woff2` | 700 | normal |
| `valkyrie-italic.woff2` | 400 | italic |
| `valkyrie-bold-italic.woff2` | 700 | italic |

UI chrome (header, nav, buttons) uses **Inter** — already Blume's curated Google
Font slug `"inter"`, no local file needed.

## Colors

| Token | Light | Dark |
| --- | --- | --- |
| Background | `#ffffff` | `#17202A` (custom `dark-bg`, not pure black — `rgb(23,32,42)`) |
| Border | `#d1d5db` (gray-300) | `#374151` (gray-700) |
| Muted foreground | `#9ca3af` (gray-400) | same |
| In-content link | `#1e83d2` | same |
| "NEW" badge | `#006DFF` | same |

## Layout measurements

- Header height: `60px` mobile (`< sm`), `70px` desktop (`sm` and up).
- Reading column: `max-width: 714px` (`.book-section` wraps `max-w-[714px]`).
- Header icon-toggle button: `40px × 40px`, `rounded-full`, `1px` border.

## Pill button (pagination "Next Section")

```
bg-black dark:bg-white text-white dark:text-black rounded-full
hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors
```

Inline caret SVG, `fill="currentColor"`.

## Icon dark-mode inversion

`.icon-invert { filter: invert() }` applied directly on the `<img>` tag (not a
wrapping element), toggled by Tailwind's `dark:` variant at the markup level.

## Title hierarchy (chapter page markup, from `/preamble`)

Top to bottom:
1. Optional chapter graphic image.
2. Bold `h2` chapter/book name — `text-4xl md:text-5xl font-semibold`.
3. "Chapter N" `h4` (`text-sm`, `font-weight:400`) flanked by two horizontal rule
   divs.
4. Italic serif `h1` page title — `font-weight:400; font-size:2.5rem`.

## Header markup

- Logo: `<img class="icon-invert" src="/images/thenetworkstate.svg">`, links to `/`.
- Nav labels (from the site's own i18n strings): Home, Book, Twitter, Newsletter.
- Mobile icon-toggle: kebab icon (`kebab-horizontal.svg`) on the homepage header,
  TOC icon (`toc.svg`) on chapter-page headers, both `md:hidden` / desktop-hidden
  patterns mirrored, both circular `40px` buttons.

## Site strings (from the site's own i18n data — short labels, not prose)

- Title: "The Network State"
- Subtitle: "How To Start a New Country"
- Author: "Balaji S. Srinivasan"
- Nav: Home, Book, Twitter, Newsletter
- "Chapter" label, "NEW" badge, "Next Section" / "Next" pagination text

## Content outline (6 chapters, 34 pages — real titles/slugs/order)

Source: the homepage's own `__NEXT_DATA__.props.pageProps.points` array (more
complete than `sitemap.xml` — includes chapter grouping). This is the
authoritative structure Phase 5 content files are built from.

1. **Quickstart**
   - `preamble` — Preamble
   - `the-network-state-in-one-sentence` — The Network State in One Sentence
   - `the-network-state-in-one-image` — The Network State in One Image
   - `the-network-state-in-one-thousand-words` — The Network State in One Thousand Words
   - `the-network-state-in-one-essay` — The Network State in One Essay
2. **History as Trajectory**
   - `prologue` — Prologue
   - `microhistory-and-macrohistory` — Microhistory and Macrohistory
   - `political-power-and-technological-truth` — Political Power and Technological Truth
   - `god-state-network` — God, State, Network
   - `people-of-god-people-of-the-state-people-of-the-network` — People of God, People of the State, People of the Network
   - `if-the-news-is-fake-imagine-history` — If the News is Fake, Imagine History
   - `fragmentation-frontier-fourth-turning-future-is-our-past` — Fragmentation, Frontier, Fourth Turning, Future Is Our Past
   - `left-is-the-new-right-is-the-new-left` — Left is the New Right is the New Left
   - `the-one-commandment` — The One Commandment
3. **The Tripolar Moment**
   - `nyt-ccp-btc` — NYT, CCP, BTC
   - `the-dated-and-the-timeless` — The Dated and the Timeless
   - `a-bipolar-america-and-a-tripolar-triangle` — A Bipolar America and a Tripolar Triangle
   - `moral-power-martial-power-money-power` — Moral Power, Martial Power, Money Power
   - `submission-sympathy-sovereignty` — Submission, Sympathy, Sovereignty
   - `conflicts-and-alliances` — Conflicts and Alliances
4. **Decentralization, Recentralization**
   - `the-possible-futures` — The Possible Futures
   - `sociopolitical-axes` — Sociopolitical Axes
   - `technoeconomic-axes` — Technoeconomic Axes
   - `foreseeable-futures` — Foreseeable Futures
   - `american-anarchy-chinese-control-international-intermediate` — American Anarchy, Chinese Control, International Intermediate
   - `victory-conditions-and-surprise-endings` — Victory Conditions and Surprise Endings
   - `towards-a-recentralized-center` — Towards a Recentralized Center
5. **From Nation States to Network States**
   - `why-now` — Why Now?
   - `on-nation-states` — On Nation States
   - `on-network-states` — On Network States
6. **Appendix**
   - `acknowledgments` — Acknowledgments
   - `about-1729` — About 1729
   - `footnotes` — Footnotes (stub only — footnote anchor/tooltip system is Tier 3, deferred)

Plus a standalone page (linked from the header, not part of the chapter tree):
`reviews` — Reviews.
