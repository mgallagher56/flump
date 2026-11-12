# Entitlements design (deferred)

> **DRAFT, agent-drafted, unreviewed, not legal advice; owner reviews and signs later.**

Source: E24-T11 in `docs/audit/plans/E24-plan.md`. Round 3 item 15 and round 4 decision D2.

**Status: DEFERRED.** No code is written for this design. It applies only once the owner decides to charge and has incorporated. Until then the launch is a free beta (D2 option A), and the paid card stays hidden behind `PRICING.status`.

## Plan model

- `free`: the beta and default plan.
- `paid`: the plan sold after the owner decides to charge.

## Entitlement keys

Each capability a plan can include gets one key. Initial set, to be confirmed when charging starts:

- `bank_connect`: connecting bank accounts for sync.
- `mcp_write`: write access through the MCP server.
- `export_formats`: export formats beyond the free set.

Add keys only when a feature is gated. Do not pre-create keys for features that are not planned.

## Enforcement

- One source of truth: `GET /v1/me/entitlements` on the backend.
- The backend guards enforce each entitlement. Web gating is display only and never the control.
- Any new paid feature must check the backend guard, not a client flag.

## Grandfathering

- Beta users keep the features they had during the free beta when charging starts. The owner sets the exact terms before any charge. The terms are a legal matter for the solicitor.

## Billing provider options

This is the owner's decision, to be taken with the decider subagent before any build.

- **A. Merchant of record:** the provider sells to the customer and takes on VAT and invoicing as the seller of record.
- **B. Stripe plus own VAT handling:** the owner handles VAT registration, invoices and the consumer terms directly.

Trade-offs (fees, tax exposure, control over the checkout) are for the decider to weigh. This document does not recommend either.

Neither option is chosen here.

## Data minimisation for billing

- Store only what billing needs: a provider customer reference, plan and entitlement state, and invoice references.
- Do not store card numbers, bank details or full billing addresses in Flump's own database.
- Add the billing provider to the processor register in `docs/legal/data-map.md` before any charge.

## Pricing page states

The pricing page reads `PRICING.status` (E24-T4). E24-T4 renders the paid card and toggle only while `FLUMP_LAUNCH` is not true or `PRICING.status === 'set'`. Once a price is set, the page needs to show, for each state:

- The price for each plan.
- The entitlements each plan includes.
- The terms link.

## Preconditions before any build

1. The owner decides to charge (O7).
2. The company is incorporated (round 3 item 15).
3. The terms and grandfathering wording are approved by the solicitor.
4. Insurance is arranged when the trigger in round 3 item 16 is met.
