# Track M - Marketing site SEO and content integrity

Scope: `apps/marketing` read by code only (server.ts, app-shell, pages, components, public). Cross-references use finding ids from the D (security) and G (unfinished) track files. Skills named in the plan (searchfit-seo) were not invoked as tools; their checklist (title, description, canonical, OG, schema, sitemap, robots, headings, SSR, links, images, headers) was applied manually.

## Summary

The site has SSR with react-helmet-async and a canonical plus description on every route, which is a decent base. The SEO plumbing around it is thin: no robots.txt or sitemap, no Open Graph, no structured data, a static `<title>` that is emitted before the Helmet one, and every unknown URL returns 200. The bigger issue is content integrity. The security, pricing and MCP pages make promises (one-click erasure, FCA AISP operation, AES at rest, a Pro trial, `npx @flump/mcp`) that the code does not back, and several of those promises are about the exact things Track D found broken.

## Findings

### [M-01] Static `<title>Flump Finance</title>` precedes the Helmet title in every SSR response

- Severity: P1
- Location: apps/marketing/index.html:7; apps/marketing/server.ts:123-132
- Evidence: The template has a hard-coded `<title>Flump Finance</title>` at line 7 and `<!--head-meta-->` at line 17. server.ts builds `helmetMeta` from `helmet.title.toString()` and substitutes it at the marker, so the page ends up with two `<title>` elements and the generic one comes first. Browsers and non-JS parsers (social unfurlers, many crawlers) take the first.
- Impact: Every page's raw HTML title is the generic brand string, so link previews and any crawler that does not run JS see no per-page title. Google renders JS and will often pick up the Helmet title, so the damage is partial but real.
- Recommendation: Delete the static `<title>` from index.html (or give it `data-rh` handling by replacing it in server.ts). Add a test that asserts exactly one `<title>` in the SSR output per route.
- Effort: S

### [M-02] No robots.txt or sitemap.xml, and the missing files return the home page with HTTP 200

- Severity: P1
- Location: apps/marketing/public (contains only `illustrations/`); apps/marketing/server.ts:71-81 and 84-136
- Evidence: `public/` holds five JPEGs and nothing else. In production sirv serves `dist/client`, and anything it does not find falls through to the catch-all SSR handler, which always ends with `res.status(200)`. So `/robots.txt`, `/sitemap.xml` and `/vite.svg` return the home page HTML with 200. A grep for `sitemap` and `robots` across `src` and `server.ts` returns nothing.
- Impact: Crawlers get HTML where they expect robots rules, which Google treats as "no robots file" but other bots handle inconsistently. There is no sitemap to declare the 9 indexable URLs (`/`, `/tools`, 7 tool pages, `/pricing`, `/security`, `/mcp`). Also hides real 404s for missing assets.
- Recommendation: Add `public/robots.txt` (allow all, `Sitemap:` line) and a `sitemap.xml` generated from `TOOLS_CATALOG` plus the static routes. Make the catch-all return 404 for paths with a file extension.
- Effort: S

### [M-03] Soft 404s: unknown URLs render the home page, and unknown tool slugs render the first tool, all with status 200

- Severity: P1
- Location: apps/marketing/src/App.tsx:22; apps/marketing/src/pages/ToolPage.tsx:30-32; apps/marketing/server.ts:134
- Evidence: `<Route path="*" element={<HomePage />} />` serves the home page (canonical `https://flump.co.uk/`) for any path. In ToolPage, `TOOLS_CATALOG.find(...) ?? TOOLS_CATALOG[0]` means `/tools/anything` renders the tax-trap page metadata and canonical, with no calculator body. The server never sets 404.
- Impact: Infinite duplicate URLs for crawlers, wasted crawl budget, and mistyped links look valid. Search Console will report soft-404s.
- Recommendation: Add a real NotFound route and set 404 from SSR (static router context or a `notFound` flag from `render`). For tool pages, 404 when the slug is not in the catalog.
- Effort: M

### [M-04] Alias tool slugs render the right calculator under the wrong title, h1 and canonical

- Severity: P2
- Location: apps/marketing/src/pages/ToolPage.tsx:28-31 vs 108-142
- Evidence: Only `mortgage-overpay-vs-isa-calculator` is normalised. The other aliases the render block accepts (`zero-percent-balance-transfer-calculator`, `landlord-section-24-tax-calculator`, `overdraft-interest-calculator`, `student-loan-plan-2-calculator`) are not in the catalog, so `toolMeta` falls back to the tax-trap entry while the matching calculator renders.
- Impact: Those URLs show the 100k tax trap h1, title, description and canonical above a different calculator. Nothing in the site links to the aliases, so exposure is only via external links, hence P2.
- Recommendation: Replace the alias list with a single `ALIASES` map that normalises to the catalog slug and issues a 301 (or at least sets the canonical to the catalog slug).
- Effort: S

### [M-05] No Open Graph, Twitter card, JSON-LD, hreflang or social image anywhere

- Severity: P2
- Location: apps/marketing/src/pages/*.tsx (Helmet blocks: HomePage.tsx:23-30, ToolsIndexPage.tsx:147-154, ToolPage.tsx:45-49, PricingPage.tsx:43-50, SecurityPage.tsx:84-91, McpPage/McpPage.tsx:160-167)
- Evidence: Each Helmet sets only title, description and canonical. A grep for `og:`, `twitter:`, `ld+json` and `hreflang` over `apps/marketing/src` finds nothing. The five JPEGs in `public/illustrations` (160-300 KB each) are not referenced by any source file.
- Impact: Poor link previews, and no eligibility for rich results where it matters: `WebApplication` or `SoftwareApplication` for each calculator, `Organization`, `BreadcrumbList` on tool pages, `FAQPage` for the home FAQ. UK-only content with no `hreflang`/`en-GB` signal is acceptable but `og:locale` should say `en_GB`.
- Recommendation: Add a shared `<Seo>` component (title, description, canonical, og:_, twitter:_, optional JSON-LD) and use it on all pages. Reuse one of the existing illustrations as `og:image` (needs absolute URL and a 1200x630 crop).
- Effort: M

### [M-06] "One-click permanent erasure ... purges all historical data" has no backing endpoin

- Severity: P1
- Location: apps/marketing/src/pages/SecurityPage.tsx:235-240, 402; apps/marketing/src/components/Footer.tsx:136 ("UK GDPR data policies")
- Evidence: Copy says deleting your account "permanently purges all historical data from our storage". The backend's only `@Delete` routes are `accounts/:id` (a single financial account), `bank-connections/:id`, `budget-entries/:id`, `mcp-tokens/:id` and one in tax.controller.ts:798. There is no user deletion, export or erasure route. `finance.service.ts:67-70` shows `deleteAccount` removes transactions then calls the intake service, and Track D (D-06) shows that path does not check ownership first. The footer "UK GDPR data policies" link goes to `/security`, which has no privacy policy, DPA or controller details.
- Impact: A legal-style promise (UK GDPR right to erasure) that the product cannot honour, on the page users are told to trust. Highest-liability copy on the site.
- Recommendation: Either build account deletion and export before publishing the claim, or reword to what exists ("delete individual accounts and connections"). Add a real privacy policy page with controller identity and contact.
- Effort: S (reword) / L (build)

### [M-07] FCA AISP claims describe a live regulated bank sync that does not exist, and no FCA registration is stated

- Severity: P1
- Location: apps/marketing/src/pages/SecurityPage.tsx:85-88, 157-162, 305; apps/marketing/src/components/HomeFAQ.tsx:43; apps/marketing/src/components/ComparisonMatrix.tsx:77; apps/marketing/src/components/SecurityPrivacySection.tsx:85, 280-291; apps/marketing/src/components/Footer.tsx:160-167; apps/marketing/src/pages/PricingPage.tsx:253, 357
- Evidence: SecurityPage says "Flump operates strictly under Account Information Service Provider (AISP) regulations", the title says "FCA AISP compliance", the pricing page lists "Regulated FCA Open Banking sync (all UK ...)", and the comparison matrix ticks "FCA Open Banking read-only sync (UK banks and cards)". A grep for `FRN`, "firm reference" and "register" across the marketing source finds no FCA registration number or reference to a regulated partner. Track G (G-02, G-05) and Track D (D-05, D-18) found the bank OAuth callback missing, Plaid as a stub and no proven provider.
- Impact: Claims of regulated status and a working sync that the code cannot deliver. Holding yourself out as FCA-authorised, or implying it, without authorisation is a regulatory risk (FSMA s.21 style financial promotion and misdescription concerns), not just a copy issue.
- Recommendation: State precisely who is regulated (the provider, for example an FCA-authorised AISP partner, with its FRN) and Flump's own status. Mark bank sync "coming soon" until G-02 is fixed, and take the tick off the comparison matrix. Get legal review.
- Effort: S (copy) / L (build)

### [M-08] Pricing page sells a Pro plan and a 14-day trial that no code implements

- Severity: P1
- Location: apps/marketing/src/pages/PricingPage.tsx:233, 253, 329-332, 357, 369, 409-415
- Evidence: Prices £9.99/month and £7.99/month (billed £95.88/yr) and a "Start 14-day free Pro trial" CTA pointing at `/signUp?plan=pro`. Track G (G-08) confirms `plan` is never read, there is no billing or entitlement code, and CSV import and daily auto-categorisation are not wired up. Confirmed here only from the marketing side: the CTA is a plain link with no other handling.
- Impact: Consumer-protection exposure (advertised price and trial for a product that cannot charge or gate), and the free vs Pro split on the page is cosmetic.
- Recommendation: Follow G-08: relabel as "Pro coming soon" with a waitlist, or build plan handling. Do not publish the prices until billing exists.
- Effort: S

### [M-09] Encryption and transport claims conflict with Track D and with what the server actually sets

- Severity: P1
- Location: apps/marketing/src/pages/SecurityPage.tsx:126, 183-187; apps/marketing/src/components/SecurityPrivacySection.tsx:124, 191; apps/marketing/src/components/Footer.tsx:81; apps/marketing/server.ts:16
- Evidence: Copy says "All sensitive personal financial records are encrypted using 256-bit AES-GCM at rest", "all network traffic is forced over TLS 1.3 with HSTS preloading" and "absolute user ownership". (a) Track D (D-11) found bank token encryption falls back to a key committed in source and that ciphertext is returned to clients, and only bank tokens are encrypted, not "all sensitive personal financial records". (b) server.ts:16 sets `max-age=31536000; includeSubDomains` with no `preload` directive and nothing indicates preload-list submission; TLS version is decided by the host proxy, not the app. (c) D-01 to D-04 and G-01/G-03 show unsigned JWTs, a shared mock session and developer data seeded into real users, which contradicts "private" and "user ownership".
- Impact: Specific technical security promises (a "bank-grade" style claim in all but name) that are overstated or false. If challenged, the page is the evidence.
- Recommendation: Reword to what is true and verified (for example "bank connection tokens are encrypted at rest"), drop "TLS 1.3" and "HSTS preloading" unless verified at the edge, and do not republish security claims until D-01 to D-04 and D-11 are closed.
- Effort: S

### [M-10] MCP page tells users to run `npx @flump/mcp`, but the package is private and unpublished

- Severity: P1
- Location: apps/marketing/src/pages/McpPage/McpPage.tsx:262; apps/marketing/src/components/McpSpotlightSection/McpSpotlightSection.tsx:87; packages/mcp/package.json:2-4
- Evidence: package.json has `"name": "@flump/mcp"` and `"private": true`, so it cannot be published to npm as configured. The page also advertises `https://mcp.flump.co.uk/mcp` as a live remote endpoint; the string appears only as the expected token audience in `packages/mcp/src/auth/token-verifier.ts:45` and in tests, and I found no deployment config for that host.
- Impact: The headline setup instructions fail for a new user ("2 minutes" setup guide). Also the MCP auth findings (D-03) make "read-only guardrails" and "OAuth 2.1" claims shaky for the remote path.
- Recommendation: Publish the package (and remove `private`), or change the instructions to the real install path. Confirm the remote host exists before showing it.
- Effort: S

### [M-11] MCP "strict PII anonymisation" is narrower than described

- Severity: P2
- Location: apps/marketing/src/pages/McpPage/McpPage.tsx:234-239, 164
- Evidence: Copy says "User names, emails, and account numbers are strictly scrubbed by default". The code has a single `anonymizeInstitutions` option (default `true`, apps/backend/src/mcp.service.ts:186) that relabels institution names. I did not find scrubbing of user names, emails or account numbers in `packages/mcp/src`.
- Impact: Users may share data with an AI agent believing PII is removed. The rate limits (60/min, 300/hr) and the 8 tools claim are accurate (rate limiter at packages/mcp/src/transports/http.ts:24, eight `registerTool` calls).
- Recommendation: Say "institution names are replaced with generic labels by default" or implement the broader scrubbing and test it.
- Effort: S

### [M-12] The inline theme script has no nonce, so the production CSP blocks i

- Severity: P2
- Location: apps/marketing/index.html:19-29; apps/marketing/server.ts:26-27
- Evidence: Production `script-src` is `'self' 'nonce-...' https:` with no `'unsafe-inline'`. server.ts adds the nonce only to the injected `__FLUMP_APP_URL__` script (line 120-121); the inline theme bootstrap in index.html has none. Not verified at runtime.
- Impact: In production the theme script is probably blocked, giving a light/dark flash on load and a console CSP error; the Vite-injected scripts are `'self'` so hydration is unaffected.
- Recommendation: Inject the nonce into every inline script in the template (replace a `__NONCE__` placeholder), or move the theme bootstrap to a static file. Related to D-15 (the `https:` source weakens the nonce anyway).
- Effort: S

### [M-13] Home FAQ answers are not in the server-rendered HTML

- Severity: P2
- Location: apps/marketing/src/components/HomeFAQ.tsx:100-106
- Evidence: `{isOpen && (<div ...>)}` renders an answer only when opened, so SSR output contains the five questions and none of the answers, and there is no `FAQPage` schema.
- Impact: Lost long-tail text and FAQ rich-result eligibility, and non-JS readers cannot see the answers.
- Recommendation: Always render answers and hide with CSS or the `hidden` attribute, and add FAQPage JSON-LD (see M-05).
- Effort: S

### [M-14] Canonical host is hard-coded and several small hygiene gaps

- Severity: P3
- Location: apps/marketing/src/pages/*.tsx canonical lines; apps/marketing/index.html:5; apps/marketing/src/pages/SecurityPage.tsx:157,255; apps/marketing/src/components/Footer.tsx:89-104
- Evidence: Canonicals are literal `https://flump.co.uk/...` even when served from the Railway host (server.ts:100-108 knows about `railway.app`), so staging pages canonicalise to production. The favicon `/vite.svg` is not in `public/` (see M-02). On SecurityPage an `h3` (line 157) precedes the first `h2` (line 255). The footer links six of the seven tools; the student-loan calculator is reachable only from `/tools`. Static assets are served by sirv with default options (server.ts:75-77), and the HTML has no `Cache-Control`.
- Impact: Minor: staging duplicates, missing favicon, weaker heading outline, one calculator one click deeper, no long-lived asset caching.
- Recommendation: Derive the canonical origin from one env value, add a favicon, fix the heading order, add the seventh tool to the footer, pass `maxAge` and `immutable` for hashed assets to sirv.
- Effort: S

## Checked and fine

- Every route has a title, meta description and canonical, and the canonical paths match the route table. No broken internal `Link` targets: all targets (`/`, `/tools`, `/tools/<slug>`, `/pricing`, `/security`, `/mcp`) exist in App.tsx.
- Security headers on the marketing server are present: HSTS, X-Frame-Options DENY, nosniff, Referrer-Policy, Permissions-Policy and a CSP (weaknesses are tracked in D-15, including stack traces in 500 responses).
- Exactly one `h1` per page on the five pages that I inspected. `lang="en"` is set; viewport meta present.

## Limits

No runtime pass: I did not build, serve or crawl the site, so the duplicate-title behaviour (M-01), nonce blocking (M-12) and the soft-404 statuses (M-02, M-03) are from reading server.ts and the template, not observed responses. I did not evaluate Core Web Vitals, image weights in rendered pages, the content of `dist/`, or the production host's TLS and edge configuration. Whether an FCA-authorised partner exists outside the repo is unknown; M-07 is about what the repo and the copy show. Legal conclusions in M-06 to M-08 need review by someone qualified.

## Quick wins

1. Remove the static `<title>` from `index.html` (M-01).
2. Add `public/robots.txt` and a generated `sitemap.xml`, and 404 file-like paths (M-02).
3. Reword the erasure, FCA, AES/TLS/HSTS-preload and Pro-trial claims, or mark those features "coming soon" (M-06 to M-09).
4. Fix the `npx @flump/mcp` instruction or publish the package (M-10).
5. Replace the catch-all and the tool-slug fallback with a real 404 (M-03) and normalise the alias slugs (M-04).
6. Add a shared `<Seo>` component with OG tags and JSON-LD (M-05), and always render FAQ answers (M-13).
