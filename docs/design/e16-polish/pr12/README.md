# E16 PR 12 screenshots: marketing pages

Before (`origin/main` at the start of this PR) and after (this PR): home, pricing, security, MCP, contact and 404 at 375 and 1280, light and dark, Playwright (Chromium) against a local production build. JPEG, full page.

Files: `<page>-<width>-<theme>-<before|after>.jpg` for `home`, `pricing`, `security`, `mcp`, `contact`, `404`. `metrics-before.json` and `metrics-after.json` hold `document.scrollHeight`, the number of visible "Request an invite" controls in `<main>` and on the whole page (header and footer add one each on every page), and whether the page scrolls sideways. No page scrolls horizontally at 375 in either set.

## Heights (light; dark is identical)

| Page     | 1280 before | 1280 after | 375 before | 375 after | Target            |
| -------- | ----------- | ---------- | ---------- | --------- | ----------------- |
| Home     | 6,725       | 3,529      | 10,634     | 4,975     | < 3,600 / < 5,500 |
| Pricing  | 1,748       | 1,142      | 2,764      | 1,358     |                   |
| Security | 1,615       | 1,247      | 2,452      | 1,667     |                   |
| MCP      | 4,762       | 1,389      | 8,321      | 1,846     | < 2,600 at 1280   |
| Contact  | 2,058       | 1,076      | 2,562      | 1,352     |                   |
| 404      | 1,065       | 900        | 1,438      | 976       |                   |

"Request an invite" in the home page body: 3 before (hero, pay-rise teaser, end), 2 after (hero, end).

## What changed

- **Home:** five sections instead of nine. Hero with one sentence and an example preview built from `KpiStrip` and `KpiCard` (3 figures, labelled "Example"); "What you can see" on a sage band with three `IconTile` cards and no figures; the pay-rise teaser with one outcome, two supporting rows and the page's one notice; a short security strip on an apricot band linking to `/security`; the FAQ (now with the one MCP answer) and the final call to action. The radial glow, monospace pills, near-black band, data-flow diagram, status-coloured figures and the MCP spotlight are gone.
- **Pricing (D10 b):** the beta plan first and prominent; the paid plan as one quiet card reading "Price not set". No billing toggle, no example price, no disabled button.
- **Security:** intro plus one list of three facts; the two cards that repeated the intro are gone; the reporting route is one line with the address as a link.
- **MCP:** written for a household reader: two sentences, three example questions, three steps, then a collapsed "Show technical details" holding the full tool list (13 tools, checked against `packages/mcp`).
- **Contact:** two cards (general, security) instead of six sections.
- **Header, footer, 404:** copy tidied; the footer links the AI connection page; the placeholder company line uses a neutral dashed outline instead of the warning colour.
- `<html lang="en-GB">`.

## Re-score (visual / simplicity)

| Page     | Before  | After     |
| -------- | ------- | --------- |
| Home     | 7 / 6   | 9.5 / 9.5 |
| Pricing  | 6 / 5   | 9 / 9     |
| Security | 7 / 8   | 9.5 / 10  |
| MCP      | 6.5 / 5 | 9.5 / 9.5 |
| Contact  | 7 / 7.5 | 9.5 / 10  |

Below 10 because of: the footer's long calculator column and "vs" labels (`utils/toolSlugs.ts`, PR 11); the pricing list's catalogue titles, including "£100k–£125k tax trap" (PR 11); nothing else on these pages (the footer top margin is gone).

## Round 2

After a design re-score: one reading width (768px) for pricing, security, MCP and contact; footer calculators folded into one "All calculators" link and the placeholder company line made quiet; home final call to action in its own tinted band with a primary button, net worth as the one emphasised preview figure, teaser assumptions behind a quiet "More"; pricing with three benefit lines and the paid plan as one quiet line; MCP with one invite, plain question cards and a bordered "Show technical details" row; contact in one column with one mailto link per card.

## Round 3

Footer aligned with the header gutter at 1280 and folded into one link column; home tints reduced to one apricot band ("What you can see") and one sage band (final call to action), the security strip on `surface.subtle`, the net worth tile without its decorative shape, two content widths (6xl and 3xl); pay-rise notice led by the standard unverified-estimate wording with the assumptions always visible; MCP note folded into the steps; one shared staging sentence on security and MCP; contact placeholder sentence inside the email line.

## Round 4

Contact without its invite block; footer heading spacing; security tiles in teal; a body-size, primary-text "Show technical details" toggle; the MCP lead at body size on phones; net worth across the top of the preview with the two supporting figures below it; the header's full "Request an invite" label at 375. Heights above are the round 4 figures.

## Check after rebasing onto polish PR 11

`tools-index-1280-light-after.jpg` and `tool-pay-rise-1280-light-after.jpg` show PR 11's tool pages with this PR's footer (one link column, aligned with the header, no extra top margin): neither page is cramped above the footer.
