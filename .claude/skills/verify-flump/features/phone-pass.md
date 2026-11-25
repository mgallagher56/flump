# Main pages at phone width

At phone width the signed-in app adds a bottom bar (Home, Accounts, Budget, Pay, More pages) and a drawer for the other pages; the header keeps its `Open navigation menu` button. Each main page fits the screen without sideways scrolling, shows its h1, and the bottom bar or the drawer marks the page the user is on.

## Sub-features

- `ph-fit` no horizontal scroll: `document.documentElement.scrollWidth` is no wider than the viewport.
- `ph-nav` the bottom bar `Main navigation` shows on every page.
- `ph-current` exactly the owning tab, or the owning drawer row, has `aria-current="page"`.
- `ph-h1` each page's h1 is visible.

## How to get to it (user POV)

- Any signed-in page on a phone: the bottom bar's tabs, and `More pages` for the drawer.
- Old paths redirect: `/app/forecast` to Savings, `/app/tax` to Self Assessment.

## Driving it with verify-flump

Preconditions:

- Baseline `homeowner` persona. Shipped journey: `V drive phone-pass <run-id>` (375x812, touch, read only).

- **Open each page.** `open(page, path)` for `/`, `/app/accounts`, `/app/budget`, `/app/accounts/history`, `/app/forecast`, `/app/debt`, `/app/savings`, `/app/pension`, `/app/mortgage`, `/app/retirement`, `/app/take-home`, `/app/tax`, `/app/profile`.
- **Fit.** Compare `document.documentElement.scrollWidth` with `window.innerWidth`.
- **Bar.** `nav[aria-label="Main navigation"]` is visible; its `[aria-current="page"]` item is `Home`, `Accounts` (accounts and history), `Budget` or `Pay` (take-home and tax), or none for drawer pages.
- **Drawer.** Tap button `More pages`; in `[data-testid="mobile-nav-drawer"]` the current row is `Savings` (savings, forecast), `Pension`, `Retirement`, `Cards and loans`, `Mortgage` or `Settings`. Press Escape to close it.
- **Proof.** One screenshot per page, and `results.json` with each page's measurements and problems.

## Gotchas

- `journey()` needs `{ viewport: { width: 375, height: 812 }, mobile: true }`; the default is 1280x900 with no bar.
- The drawer lists Self Assessment only when that page is switched on, so on `/app/tax` the homeowner's drawer marks nothing.
- Close the drawer before the step ends, or it covers the page in the screenshot.
