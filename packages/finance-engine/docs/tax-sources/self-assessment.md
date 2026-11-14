# Self Assessment: trading and property allowances, payments on account

Read with WebFetch on 2026-11-14. WebFetch summarises pages, so values are as reported by that extraction. Nothing here is owner-signed: the 41 vectors in `src/test-vectors/uk-self-assessment.vectors.ts` are all unsigned.

- [ALLOW] https://www.gov.uk/guidance/tax-free-allowances-on-property-and-trading-income (page last updated 8 May 2019). Reported: "up to £1,000 each tax year" for property or trading income; "you can deduct up to £1,000, but not more than the amount of your income"; "You cannot deduct any other expenses or allowances if you claim the allowances"; the property allowance cannot be used with finance cost relief; each joint owner has the allowance against their own share of the rent.
- [POA] https://www.gov.uk/understand-self-assessment-bill/payments-on-account. Reported: none when the last bill was less than £1,000, or when more than 80% of the tax owed was already paid at source; "Each payment is usually half of the tax you owed the previous year"; due by midnight on 31 January and 31 July. Worked example: a £3,000 bill with no payments on account made gives £4,500 due by 31 January and £1,500 by 31 July.
- [RAS] https://www.gov.uk/tax-on-your-private-pension/pension-tax-relief. Reported: under relief at source "your pension provider claims tax relief from the government at the basic 20% rate and adds it to your pension pot".
- [C4] https://www.gov.uk/self-employed-national-insurance-rates (2026 to 2027). Reported: Class 4 at 6% on profits over £12,570 up to £50,270 and 2% above.

| Figure                                     | Year               | Value         | Source  | Status                            |
| ------------------------------------------ | ------------------ | ------------- | ------- | --------------------------------- |
| Trading allowance                          | 2026/27            | 1,000         | [ALLOW] | VERIFIED                          |
| Trading allowance                          | 2020/21 to 2025/26 | 1,000         | [ALLOW] | UNVERIFIED: current guidance only |
| Property allowance                         | 2026/27            | 1,000         | [ALLOW] | VERIFIED                          |
| Property allowance                         | 2020/21 to 2025/26 | 1,000         | [ALLOW] | UNVERIFIED: current guidance only |
| Payments on account: bill threshold        | 2026/27            | 1,000         | [POA]   | VERIFIED                          |
| Payments on account: share taken at source | 2026/27            | more than 80% | [POA]   | VERIFIED                          |
| Payments on account thresholds             | 2020/21 to 2025/26 | 1,000 and 80% | [POA]   | UNVERIFIED: current guidance only |

## How the engine applies them

- Trading: income less the larger of the recorded costs and the allowance (`calculateTradingProfit`).
- Property: two routes are worked out and the lower total is kept. With the recorded costs, finance costs earn the Section 24 credit. With the allowance, neither the costs nor the credit is used (`calculateUKTax` in `src/tax-calculator.ts`).
- Payments on account: PAYE Income Tax on the salary counts as tax taken at source; the schedule assumes no payments on account were made towards the bill (`calculateSelfAssessmentPayments`).

## Not modelled

The cases where the allowances cannot be used (income from your own company, a partnership or your employer; Rent a Room), reducing payments on account, the Class 1 and Class 4 annual maximum for someone with both a salary and profits, the £3,600 relief at source limit for low earners, and Scottish relief at source above the basic rate (flagged as an unverified assumption in `computeUkTakeHome`).
