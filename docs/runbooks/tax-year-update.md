# Annual tax-year update runbook

Why: from **6 April each year** the app needs the new year's rates. If they are missing it uses
the latest year it has and shows a banner ("using 20XX/YY rates"). It must never crash or quietly
show stale figures. Hard deadline for the first cycle: **6 April 2027** (2027/28).

## What guards you

| Guard              | Where                                                                                        | What it does                                                                                                                                                                                                                                                                 |
| ------------------ | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calendar guard     | `bun run check:tax-calendar` (`scripts/check-tax-year-calendar.ts`), runs in the CI Lint job | Warns from 1 December, **fails PRs and the weekly run from 1 March** if next year's table is missing. Warns from 15 March and fails from 1 April if it is only provisional. On push to `main` it only warns, so deploys are never blocked. Exit codes: 0 ok, 1 fail, 3 warn. |
| Year context       | `getUkTaxYearContext()` in `packages/finance-engine`                                         | The one place that may substitute a year. Returns `isFallback: true` when the clock is past the last supported year.                                                                                                                                                         |
| Strict calculators | all of `finance-engine`                                                                      | An explicit unsupported year throws `UnsupportedUkTaxYearError`. No silent fallback.                                                                                                                                                                                         |
| Sign-off check     | `packages/finance-engine/src/test-vectors/signoff.ts`                                        | A vector is "signed" only with a signer name in `signedOffBy`, a date and a matching content hash. Editing a signed vector invalidates it.                                                                                                                                   |

## Calendar (normal pattern)

| When                 | What appears                                                          | You do                                                                                                                   |
| -------------------- | --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Late Oct to late Nov | Budget; OOTLAR Annex A about a week later                             | Start the new year table (below). Tick the checklist: `docs/runbooks/tax-2027-28-verification-checklist.md` for 2027/28. |
| Dec to Jan           | Scottish Budget (Scottish bands), Welsh rates, HMRC student-loan spec | Fill Scottish, Welsh and student-loan values.                                                                            |
| Late Jan / early Feb | GOV.UK "rates and thresholds for employers" page for the year         | Verify every value against it.                                                                                           |
| By about 20 March    |                                                                       | A Fable decider rules on the vectors and the coordinator signs them; flip the year to confirmed; release.                |
| 6 April              | Go-live                                                               | Confirm the live site shows the new year with **no banner**.                                                             |

## Adding a year (steps)

1. Add the year's tables in `packages/finance-engine/src/tax-rules.ts` and `uk-tax-year.ts` and append it to `SUPPORTED_UK_TAX_YEARS` in `types.ts` (and `UK_TAX_VECTOR_YEARS`). Every figure needs a source URL. Anything not yet confirmed is marked `UNVERIFIED:` with a reason.
2. If the table is not final, mark it provisional in `scripts/check-tax-year-calendar.ts` so the guard keeps nagging until it is confirmed.
3. Add vectors for the year to `test-vectors/uk-tax.vectors.ts` (hand-derived from GOV.UK, never computed by the engine). All start with `signedOffBy: null`.
4. Tests that assert "the first unsupported year throws" use `getFirstUnsupportedUkTaxYear()`, so they move on automatically.
5. Update `packages/finance-engine/docs/tax-sources/*.md`.
6. Run the four gates plus `bun run check:tax-calendar`.

**Never load unverified figures as verified.** A year carrying any carried-forward or announced value must be provisional.

## Sign-off of vectors (a Fable decider decides)

Owner rule of 20 November 2026 (DECISIONS, "a Fable decider signs off tax figures", superseding the owner sign-off part of round 3 item 13): the owner no longer signs off tax figures. A Fable decider decides them and is recorded as the signer. The paid accountant hour in round 3 item 13 is not changed by that rule and remains the owner's to decide before public launch.

1. The lane that built the figures writes a figure table (each vector or pinned test: old, new, working, source) and hands it to a Fable decider. The decider is independent of that lane: a separate agent that wrote none of the figures.
2. The decider checks each figure against its source and rules. For an UNVERIFIED vector it writes the judgement call, its ruling (a vector cannot be signed without one).
3. The coordinator records the decision and prepares a sheet for exactly the vectors the decider signed:

```bash
bun run tax:signoff sheet --year 2027/28 --out <sheet file>
```

Tick `[x]` only the vectors the decider signed, delete the rest, and copy each ruling onto its `ruling:` line.

4. The coordinator, applying the recorded decision, or the owner runs:

```bash
bun run tax:signoff apply --year 2027/28 --sheet <sheet file> --signer fable-decider
```

`--signer` is written to `signedOffBy` exactly as given. The tool refuses to run in CI. A lane agent never signs its own figures. This writes `signedOffBy`, `signedOffAt` and a version 2 `signedOffHash` ("v2:", binding the content, signer, status, ruling and reason) into the vectors file; review the diff, run `bun scripts/check-tax-signoff.ts --write-baseline` and commit. The owner's 2027/28 signatures of 20 November 2026 (`signedOffBy: "owner"`) stay valid.

## 6 April checklist

- Live site shows the new year, no "using older rates" banner.
- Read GOV.UK `income-tax-rates`, `scottish-income-tax`, `welsh-income-tax` for last-minute changes.
- `bun run check:tax-calendar` exits 0.

## Sources

GOV.UK Content API (JSON, no key): `https://www.gov.uk/api/content/<path>`. Useful pages: `income-tax-rates`, `scottish-income-tax`, `welsh-income-tax`, `tax-on-dividends`, `repaying-your-student-loan`, the Budget OOTLAR Annex A, and the employer rates-and-thresholds page. Subscribe by hand to "Get emails about this page" on each.
