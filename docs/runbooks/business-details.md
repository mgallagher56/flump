# Owner runbook: replace the placeholder business details

All business details live in ONE typed file: `packages/business-details/src/index.ts` (`BUSINESS_DETAILS`). The marketing site (footer, pricing page, security page, security.txt) and the web app (footer, feedback mailto) read from it. Nothing else holds a copy.

Nothing in the site references an ICO number yet; add an `icoRegistrationNumber` field when one is shown.

Each field is `{ value, isPlaceholder }`. For each real value: replace `value` and set `isPlaceholder: false`.

| Field              | What it is                                            | Placeholder today                                   |
| ------------------ | ----------------------------------------------------- | --------------------------------------------------- |
| `legalName`        | Registered company name                               | `Flump Finance Ltd`                                 |
| `tradingName`      | Name customers see                                    | `Flump` (already real)                              |
| `companyNumber`    | Companies House number                                | `00000000`                                          |
| `registeredOffice` | Registered office address                             | `Registered office address to be confirmed`         |
| `supportEmail`     | Support mailbox (footer, feedback links)              | `support@example.invalid`                           |
| `securityContact`  | Vulnerability reports (security page, `security.txt`) | `security@example.invalid`                          |
| `price`            | `monthly` (pounds), `annual` (pounds) and `label`     | £4.99, £49, `Introductory price, subject to change` |

Emails use the RFC 2606 `.invalid` domain, which can never resolve, so nothing is ever sent to an address we do not own.

## The launch guard

A public launch means `ALLOW_INDEXING=true` or `FLUMP_LAUNCH=true` (exactly `true`). While any field is still `isPlaceholder: true`:

- `bun scripts/check-launch-placeholders.ts <dir>` (run at the end of the web and marketing builds) exits 1 and lists the fields.
- The marketing server and the web server throw at boot (`assertLaunchReady`).

Without those flags, development, CI and noindex staging are unaffected. Run the guard yourself with `FLUMP_LAUNCH=true bun scripts/check-launch-placeholders.ts apps/marketing/dist`, or add `--force`.

## Steps

1. Edit the fields above in `packages/business-details/src/index.ts`. Clear `isPlaceholder` on each one you replace.
2. Set `SECURITY_CONTACT` in production if you want `security.txt` before editing the file (the env value wins; a placeholder contact is never published in `security.txt`).
3. Update the tests that quote values if you changed their shape (`packages/business-details/src/index.test.ts`).
4. Run `bun run lint`, `bun run check-types` and `bun run test`, then `FLUMP_LAUNCH=true bun run build`.
5. Then follow `docs/runbooks/launch-day.md`.
