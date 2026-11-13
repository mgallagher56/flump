# Launch day runbook

> **DRAFT, agent-drafted, unreviewed, not legal advice; owner reviews and signs later.**

Source: E24-T7 in `docs/audit/plans/E24-plan.md`. Domain, DNS and env details are in [launch-domain-and-email.md](./launch-domain-and-email.md).

> **Verify against the live console.** Railway dashboard labels change. Find the matching control before acting on each step.

## Sequence

Run the steps in order. Stop at the first failure and do not go on.

1. Run `bun run check:launch --strict`. It must pass. (Planned, E24-T1; does not exist yet.)
2. Swap the placeholders for real business details in `packages/business-details/src/index.ts` (see `business-details.md`) (E24-T8). For the friends beta, the footer carries a truthful sole-trader operator line with the name the owner supplies (E24-T12, `LEGAL_ENTITY.kind`). Company details wait for incorporation, so the company-details guard keeps blocking until then (round 4 D5). The guard now also blocks a friends-beta launch while any `isPlaceholder` field remains in `packages/business-details`, so replace those fields (or set them real) first.
3. Set `FLUMP_LAUNCH=true` (planned, E24-T1; does not exist yet) on the web and marketing services. The build guard must pass. A failing guard means the launch build still contains placeholder pricing or company text.
4. Set `SITE_URL` on marketing.
5. Set `ALLOW_INDEXING=true` on marketing **only**. The web app stays noindex permanently (round 4 decision D3).
6. The owner submits the sitemap to Google Search Console and Bing (O9).
7. Turn analytics on only after the cookie and storage notice is live (E24-T9). Set `ANALYTICS_MODE` and `ANALYTICS_NOTICE_URL` on marketing.

## Rollback

- To stop indexing, unset `ALLOW_INDEXING` on marketing and redeploy. This is the fastest rollback for search visibility.
- To stop analytics, unset `ANALYTICS_MODE`. The middleware is off unless both analytics variables are set.

## Checks after each change

- After step 3 (`FLUMP_LAUNCH` is planned, E24-T1), confirm the build output has no paid-price text. A `FLUMP_LAUNCH=true` build lists only the company and price hits that the owner has approved.
- After step 5, confirm `robots` output on marketing allows indexing and the web app still sends `noindex`.
- After step 7, confirm the notice URL loads and the analytics middleware sets no cookie.
