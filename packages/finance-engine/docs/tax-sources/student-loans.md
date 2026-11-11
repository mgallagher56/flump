# Student loan and postgraduate loan thresholds, 2020/21 to 2026/27

All pages fetched via WebFetch in this session. Annual thresholds in GBP. Repayment rate: 9% (Plans 1/2/4/5), 6% (postgraduate) of income above threshold, confirmed on every employer page below.

Base URL pattern: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-YYYY-to-YYYY (section "Student loan and postgraduate loan recovery").

## Per tax year

### 2020/21 - https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021

Table in the student loan section, page states figures apply to 2020 to 2021.

- Plan 1: 19,390 - VERIFIED
- Plan 2: 26,575 - VERIFIED
- Plan 4: not listed on page - UNVERIFIED (not on page; Plan 4 absent)
- Plan 5: not applicable (did not exist) - n/a
- Postgraduate: 21,000 - VERIFIED
- Rates 9% / 6% - VERIFIED

### 2021/22 - https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022

- Plan 1: 19,895 - VERIFIED
- Plan 2: 27,295 - VERIFIED
- Plan 4: 25,000 - VERIFIED
- Postgraduate: 21,000 - VERIFIED
- Rates 9% / 6% - VERIFIED

### 2022/23 - https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023

- Plan 1: 20,195 - VERIFIED
- Plan 2: 27,295 - VERIFIED
- Plan 4: 25,375 - VERIFIED
- Postgraduate: 21,000 - VERIFIED
- Rates 9% / 6% - VERIFIED
- Plan 5 not on page (consistent with Plan 5 starting 2023/24).

### 2023/24 - https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024

- Plan 1: 22,015 - VERIFIED
- Plan 2: 27,295 - VERIFIED
- Plan 4: 27,660 - VERIFIED
- Plan 5: page does not list Plan 5 (re-queried to confirm) - UNVERIFIED. MEMORY ONLY: Plan 5 threshold was 25,000 from its introduction.
- Postgraduate: 21,000 - VERIFIED
- Rates 9% / 6% - VERIFIED

### 2024/25 - https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025

- Plan 1: 24,990 - VERIFIED
- Plan 2: 27,295 - VERIFIED
- Plan 4: 31,395 - VERIFIED
- Plan 5: page does not list Plan 5 (re-queried) - UNVERIFIED. MEMORY ONLY: 25,000.
- Postgraduate: 21,000 - VERIFIED
- Rates 9% / 6% - VERIFIED

### 2025/26 - https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026

Table in student loan section; no notes below it.

- Plan 1: 26,065 - VERIFIED (monthly 2,172.08, weekly 501.25)
- Plan 2: 28,470 - VERIFIED (monthly 2,372.50, weekly 547.50)
- Plan 4: 32,745 - VERIFIED (monthly 2,728.75, weekly 629.71)
- Plan 5: page does not list Plan 5 (re-queried) - UNVERIFIED. MEMORY ONLY: 25,000.
- Postgraduate: 21,000 - VERIFIED
- Rates 9% / 6% - VERIFIED

### 2026/27 - https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027

- Plan 1: 26,900 - VERIFIED (monthly 2,241.66, weekly 517.30)
- Plan 2: 29,385 - VERIFIED (monthly 2,448.75, weekly 565.09)
- Plan 4: 33,795 - VERIFIED (monthly 2,816.25, weekly 649.90)
- Plan 5: 25,000 - VERIFIED (monthly 2,083.33, weekly 480.76)
- Postgraduate: 21,000 - VERIFIED
- Rates 9% / 6% - VERIFIED

### Cross-check: https://www.gov.uk/repaying-your-student-loan/what-you-pay

Undated "current" table: Plan 1 26,900; Plan 2 29,385; Plan 4 33,795; Plan 5 25,000; PGL 21,000; rates 9%/6%. Matches the 2026/27 employer page. The page itself gives no tax year, so it is corroboration only, and it does NOT support the 2025/26 values. It gives no write-off periods.

## Write-off periods

Source read: https://www.gov.uk/repaying-your-student-loan/when-your-student-loan-gets-written-off-or-cancelled (paraphrased)

- Plan 1: 25 years after the April first due to repay if first loan paid on/after 1 Sep 2006; if before, written off at age 65 - VERIFIED
- Plan 2: 30 years after the April first due to repay - VERIFIED
- Plan 4: 30 years after the April first due to repay if first loan paid on/after 1 Aug 2007; if before, age 65 or 30 years, whichever is first - VERIFIED
- Plan 5: 40 years after the April first due to repay - VERIFIED
- Postgraduate (England/Wales): 30 years after the April first due to repay - VERIFIED. NI postgrads follow Plan 1 rules, Scottish follow Plan 4.
- Per-tax-year variation in write-off periods was not checked (page is current-rules only). Dates by tax year are UNVERIFIED.

Failed fetches: gov.uk/student-loan-forgiveness (404), gov.uk/guidance/previous-student-loan-repayment-thresholds (404), .../when-your-student-loan-gets-written-off (that page lacks content).

## Discrepancies vs repo

Repo: /Users/marcgallagher/personal/flump/.claude/worktrees/e4-tax-engine-48e7e3/packages/finance-engine/src/

| file:line                        | repo value | verified value |
| -------------------------------- | ---------- | -------------- |
| tax-rules.ts:521 (2025/26 plan1) | 26,900     | 26,065         |
| tax-rules.ts:522 (2025/26 plan2) | 29,385     | 28,470         |
| tax-rules.ts:523 (2025/26 plan4) | 33,795     | 32,745         |

Notes:

- The repo's 2025/26 block contains the 2026/27 figures; the user-supplied figures in the task (26,065/28,470/32,745) are the verified 2025/26 ones.
- uk-tax.ts:29-43 (STUDENT_LOAN_THRESHOLDS: Plan 1 26,065, Plan 2 28,470, Plan 4 32,745) match verified 2025/26 but are a single undated table; they are stale for 2026/27 (verified 26,900 / 29,385 / 33,795). Not strictly a discrepancy against any single year; flag if the engine treats it as current.
- debt-payoff.ts:629-633 (evaluateUkStudentLoan): plan1 24,990, plan2 27,295, plan4 31,395 are the verified 2024/25 values, stale versus 2025/26 and 2026/27. Plan 5 25,000 / postgrad 21,000 match verified 2026/27 and 2025/26 PGL.
- Matches verified: tax-rules.ts 2023/24 (lines 501-503, 505), 2024/25 (511-513, 515), 2026/27 (531-535), postgrad 21,000 and rates throughout, write-off years 25/30/30/40/30 in uk-tax.ts and debt-payoff.ts (simplified: the pre-2006/pre-2007 age-65 rules are not modelled).
- Repo has no entries for 2020/21, 2021/22, 2022/23.
- Repo Plan 5 25,000 in 2023/24-2025/26 is UNVERIFIED (employer pages for those years do not list Plan 5).
