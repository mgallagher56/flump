# E16 round 2, R2-3: calculator bodies and tool pages

Before (`*-before.jpg`) is `main` at `ab290345`; after (`*-after.jpg`) is this branch. Marketing tool pages at 375 and 1280, light and dark, and both `/tools` indexes at 1280 light. The web tool pages render the same calculator bodies, so they are not repeated here.

Counts from `apps/e2e/sweep/metrics.ts` at 1280 by 800 (N1 first view, N whole page with disclosures closed). This PR fixes that counter to skip the body of a closed `<details>`; the "before" column was taken with the old counter, which also counted the closed guide.

| Tool                  | Before N1 / N | After N1 / N                         |
| --------------------- | ------------- | ------------------------------------ |
| Debt payoff methods   | 2 / 4         | 2 / 2                                |
| 0% balance transfer   | 9 / 10        | 4 / 4 (one is the "0%" in the title) |
| Overdraft             | 2 / 5         | 2 / 2                                |
| Mortgage or ISA       | 7 / 13        | 3 / 3                                |
| Student loan          | 8 / 8         | 2 / 2                                |
| Pay rise              | 7 / 18        | 2 / 2                                |
| Section 24            | 8 / 11        | 3 / 3                                |
| Income above £100,000 | 9 / 27        | 3 / 3                                |

Scores (visual / simplicity), independent re-score with the design-critique heuristics: RESCORE had every tool page at 7.5 / 7 (web) and 7.5 / 7 (marketing). After: debt 9.5 / 9.5, 0% 9.5 / 9, overdraft 9 / 9.5, mortgage 9.5 / 9.5, student loan 9.5 / 9.5, pay rise 9 / 9, Section 24 9.5 / 9, £100k 9 / 9, marketing index 9.5 / 9.5, web index 9.5 / 9.5, before the last small fixes in this PR (overdraft caption into the card, pay rise table into a drawer, one-line slider labels).
