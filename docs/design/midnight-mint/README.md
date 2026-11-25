# Midnight and Mint mock-ups

Owner decision, 24 November 2026: Midnight (dark) and Mint (light) replace the E15 "Direction C" cream and teal look. The decision and the light rules are in [`docs/ux/STYLE-GUIDE.md`](../../ux/STYLE-GUIDE.md) section 14.

The four `.dc.html` files are static design mock-ups. They hold sample data only: no figure, name or account in them is real.

| File                    | What it shows                                                                                                                                        |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Midnight.dc.html`      | The dark theme: charcoal canvas, cards and borders, mint headline figures and primary buttons, soft pink for small accents                           |
| `LightMint.dc.html`     | The light theme: mint canvas, off-white cards, the solid mint headline panel with dark ink, teal links, charcoal primary buttons                     |
| `PageMarketing.dc.html` | The marketing home page band order: hero, how it works, net worth, savings, tools, privacy on a solid mint band, questions, then the charcoal footer |
| `PageApp.dc.html`       | The app Home page: the headline panel, section titles on a dark rule, and the cards below                                                            |

**Tokens are the source of truth, not the mock-up hex.** The mock-ups use raw hex values so they open in a browser on their own. Code uses the semantic tokens in `packages/tokens/src/index.ts`. Where a mock-up and the tokens differ, the tokens win.

The app and marketing mock-ups draw the light logo as a charcoal dot. The owner rejected that on 25 November 2026: the logo is teal in light and mint in dark (`primary.mark` and `primary.markLit`).
