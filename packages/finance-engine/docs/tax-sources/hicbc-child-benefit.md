# High Income Child Benefit Charge and Child Benefit rates (E25-T2)

Read on 2026-11-13. Registry keys: `hicbc`, `childBenefit` in `src/uk-rule-sources.ts`.

## HICBC thresholds (verified, all years)

Page: https://www.gov.uk/child-benefit-tax-charge

- Tax years up to and including 2023 to 2024: charge starts over 50,000; "1% for every 100 you earned over 50,000"; 100% at 60,000.
- Tax years starting from 2024 to 2025: charge starts over 60,000; "1% of your Child Benefit for every 200 you earn over 60,000"; 100% at 80,000.
- Modelled on the individual basis (claimant is the higher earner). The step rule (1% per full £200 of adjusted net income over £60,000, £100 over £50,000 before 2024/25) is from GOV.UK, because the ITEPA 2003 s.681C(2)(b) formula is an image on legislation.gov.uk.
- Rounding, ITEPA 2003 s.681C(3) (https://www.legislation.gov.uk/ukpga/2003/1/section/681C): the total Child Benefit is rounded down to whole pounds, then the percentage down to a whole number, then the charge down to whole pounds.

## Child Benefit weekly rates (eldest or only child / each other child)

Each year's instrument amends reg 2(1)(a) (enhanced rate) and (b) (other cases) of the Child Benefit (Rates) Regulations 2006 (SI 2006/965). Read by `fable-decider` on 2026-11-25, as made and as the point-in-time reg 2, at legislation.gov.uk. Each instrument's "from" figure is the previous year's rate, so the chain is continuous from 20.70 / 13.70.

| Year    | Rate          | Status   | Instrument (provision, in force)                                                    |
| ------- | ------------- | -------- | ----------------------------------------------------------------------------------- |
| 2020/21 | 21.05 / 13.95 | verified | SI 2020/298 reg 5, 6 April 2020: https://www.legislation.gov.uk/uksi/2020/298/made  |
| 2021/22 | 21.15 / 14.00 | verified | SI 2021/156 reg 5, 12 April 2021: https://www.legislation.gov.uk/uksi/2021/156/made |
| 2022/23 | 21.80 / 14.45 | verified | SI 2022/231 reg 5, 11 April 2022: https://www.legislation.gov.uk/uksi/2022/231/made |
| 2023/24 | 24.00 / 15.90 | verified | SI 2023/237 reg 5, 10 April 2023: https://www.legislation.gov.uk/uksi/2023/237/made |
| 2024/25 | 25.60 / 16.95 | verified | SI 2024/247 reg 5, 8 April 2024: https://www.legislation.gov.uk/uksi/2024/247/made  |
| 2025/26 | 26.05 / 17.25 | verified | SI 2025/292 art 2, 7 April 2025: https://www.legislation.gov.uk/uksi/2025/292/made  |
| 2026/27 | 27.05 / 17.90 | verified | SI 2026/232 art 2, 6 April 2026: https://www.legislation.gov.uk/uksi/2026/232/made  |

Each instrument comes into force on the first Monday on or after 6 April. That is the first week whose Monday falls in the tax year, so one rate per tax year (counted by Mondays, below) matches the instruments.

The regulations call the two rates "enhanced rate" and "other cases". Reading them as eldest or only child and other children matches the rates table for 2025/26 and 2026/27.

## Open ruling

Annual Child Benefit is the weekly rate x the Mondays in the tax year, 52 or 53 (ITEPA 2003 s.681H(3), https://www.legislation.gov.uk/ukpga/2003/1/section/681H: a week counts in the tax year in which its Monday falls; decider ruling adopted 20 November 2026). The count is worked from the calendar by `childBenefitWeeksInTaxYear`: 2020/21 and 2026/27 have 53, 2021/22 to 2025/26 and 2027/28 have 52. The engine holds one weekly rate per tax year; Child Benefit is uprated from the first Monday on or after 6 April, so every week that counts in a year is paid at that year's rate. Weekly rates for 2020/21 to 2024/25 are cited from archived copies of the GOV.UK rates table (captured 31 May 2022 and 7 June 2024) and, from 2022/23, the uprating SIs.

## Not sourced here

- Relief-at-source band extension: the GOV.UK pension tax relief page does not state it. Vectors cite ITA 2007 s.414 and are UNVERIFIED.
- April 2029 salary sacrifice cap: https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029 states a 2,000 NI-exempt cap from April 2029; design details are left to secondary legislation, so every vector is an illustration at 2026/27 rates.
