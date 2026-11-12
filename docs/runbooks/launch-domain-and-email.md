# Launch runbook: domain, email routing and env changes

> **DRAFT, agent-drafted, unreviewed, not legal advice; owner reviews and signs later.**

Source: E24-T7 in `docs/audit/plans/E24-plan.md`. Owner steps O1, O2, O4 and O5 in the same plan.

> **Verify against the live console.** Cloudflare and Railway dashboard labels change. Each step below names the intent. Find the matching control in the live console before acting.

## 1. Cloudflare DNS for the Railway custom domains

1. Add the domain to Cloudflare (free plan).
2. For each Railway custom domain, add the CNAME record that Railway shows in its domain settings. Add the TXT record Railway uses for ownership verification, if it asks for one.
3. Keep the Cloudflare proxy **off** (DNS only, grey cloud) until the cutover in O5. Round 3 item 11 requires this. Railway needs to issue its certificate directly.
4. After the cutover, turn the proxy on and set `TRUST_PROXY_HOPS` on the backend (see section 4).

## 2. Cloudflare Email Routing

Email Routing receives mail only. It forwards these addresses to the owner's inbox:

- `support@<domain>`
- `privacy@<domain>`
- `security@<domain>`

Steps:

1. Enable Email Routing for the zone.
2. Add a custom address for each of the three names, with the owner's inbox as the destination.
3. Verify the destination inbox from the confirmation email Cloudflare sends.
4. Send a test message to each address from an outside account and confirm it arrives.

**Replies are not covered.** Routing does not send mail. Replies from `support@` need a sending setup. Round 4 decision D4 chose Gmail "send mail as" through a free SMTP relay for the beta. The owner sets this up (O3).

## 3. SPF and DMARC for routing

Email Routing adds the records it needs for inbound forwarding. Check the zone's DNS for:

- An SPF TXT record at the apex that includes the sending services in use. Routing alone does not send, so an SPF record only needs to match whatever sends replies.
- A DMARC TXT record at `_dmarc.<domain>`. Start with `p=none` and a reporting address, then tighten once reports look clean.

Confirm the final record set against the sending provider's documentation before publishing.

## 4. Per-service environment change list

Set these at launch, in the Railway environment for each service.

**Marketing**

- `APP_URL` and `VITE_APP_URL`: the public marketing origin.
- `SECURITY_CONTACT`: `security@<domain>`. Set this now (O4).
- `SITE_URL`: the canonical origin, set at launch.
- `ALLOW_INDEXING`: set to `true` at launch only (see [launch-day.md](./launch-day.md)).
- `FLUMP_LAUNCH`: set to `true` at launch.
- Analytics variables: `ANALYTICS_MODE` and `ANALYTICS_NOTICE_URL`, only after the notice is live (O4 and T9).

**Web**

- `VITE_MARKETING_URL`: the marketing origin.
- `VITE_WORKOS_REDIRECT_URI`: the production redirect URI registered with WorkOS.

**Backend**

- `CORS_ALLOWED_ORIGINS`: the production web and marketing origins.
- WorkOS: switch to the Production environment and register the new redirect URIs (O5).
- `TRUST_PROXY_HOPS`: set once the Cloudflare proxy is on. See `docs/security/owner-steps.md:36`.

## 5. Hardcoded Railway fallbacks to override

The code falls back to Railway hostnames when an env var is missing. Each fallback must be overridden before launch, or the production build may point at the wrong origin.

- `security.ts:3`, `security.ts:13-14`
- `url.ts:27-30`
- `marketingUrl.ts:12`

Confirm each one reads its env var first in the production build. Do not remove the fallbacks in this runbook. Changing them is a code change with its own ticket.

## 6. HSTS preload

Consider HSTS preload only after three stable months on the production domain. Submitting too early is hard to reverse. Record the date the domain first served HSTS before deciding.

## Related

- [launch-day.md](./launch-day.md): the launch sequence.
- [support-and-feedback.md](./support-and-feedback.md): mailbox checks and feedback handling.
