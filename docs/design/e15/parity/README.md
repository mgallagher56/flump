# Marketing / app chrome parity (2026-11-14)

Header, footer and (at 375px) the open mobile drawer for the marketing site (`/`) and the web
app's public pages (`/tools`), at 375, 768 and 1280 wide, light and dark. File names are
`<surface>-<part>-<width>-<theme>.png`.

Both surfaces render the same `@repo/ui` chrome: `TopBar`, `HomeLogo`, `ThemeToggle`, `NavDrawer`
and `SiteFooter`, with the same `favicon.svg`.

Nav switch, measured with Playwright on both surfaces in both themes:

| Width  | Menu button | Inline nav |
| ------ | ----------- | ---------- |
| 1023px | shown       | hidden     |
| 1024px | hidden      | shown      |

The switch comes from `NAV_BREAKPOINT` (64rem, Panda `lg`) through the `navInline` /
`navCollapsed` conditions in `packages/ui/panda.preset.ts`. Below it the theme toggle moves from
the top bar into the drawer on both surfaces, so neither overflows at 375px.
