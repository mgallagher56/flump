# High Income Child Benefit Charge and Child Benefit rates (E25-T2)

Read on 2026-11-13. Registry keys: `hicbc`, `childBenefit` in `src/uk-rule-sources.ts`.

## HICBC thresholds (verified, all years)

Page: https://www.gov.uk/child-benefit-tax-charge

- Tax years up to and including 2023 to 2024: charge starts over 50,000; "1% for every 100 you earned over 50,000"; 100% at 60,000.
- Tax years starting from 2024 to 2025: charge starts over 60,000; "1% of your Child Benefit for every 200 you earn over 60,000"; 100% at 80,000.
- Modelled on the individual basis (claimant is the higher earner). The percentage is floored to a whole per cent per full step.

## Child Benefit weekly rates (eldest or only child / each other child)

| Year    | Rate          | Status     | Source                                                                                                                                                              |
| ------- | ------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2020/21 | 21.05 / 13.95 | UNVERIFIED | No GOV.UK page reached; recalled from the uprating chain                                                                                                            |
| 2021/22 | 21.15 / 14.00 | UNVERIFIED | No GOV.UK page reached; recalled from the uprating chain                                                                                                            |
| 2022/23 | 21.80 / 14.45 | verified   | The 2023 uprating regulations name 21.80 and 14.45 as the rates they replace: https://www.legislation.gov.uk/uksi/2023/237/made                                     |
| 2023/24 | 24.00 / 15.90 | verified   | Same regulations (in force 10 April 2023)                                                                                                                           |
| 2024/25 | 25.60 / 16.95 | verified   | https://www.legislation.gov.uk/uksi/2024/247/made (in force 8 April 2024)                                                                                           |
| 2025/26 | 26.05 / 17.25 | verified   | https://www.gov.uk/government/publications/rates-and-allowances-tax-credits-child-benefit-and-guardians-allowance/tax-credits-child-benefit-and-guardians-allowance |
| 2026/27 | 27.05 / 17.90 | verified   | Same table                                                                                                                                                          |

The regulations call the two rates "enhanced rate" and "other cases". Reading them as eldest or only child and other children matches the rates table for 2025/26 and 2026/27.

## Open ruling

Annual Child Benefit is taken as weekly rate x 52. Some tax years contain 53 Mondays, so the real annual amount, and the charge, can differ. Every HICBC vector is UNVERIFIED for this reason until the owner rules.

## Not sourced here

- Relief-at-source band extension: the GOV.UK pension tax relief page does not state it. Vectors cite ITA 2007 s.414 and are UNVERIFIED.
- April 2029 salary sacrifice cap: https://www.gov.uk/government/publications/changes-to-salary-sacrifice-for-pensions-from-april-2029/changes-to-salary-sacrifice-for-pensions-from-april-2029 states a 2,000 NI-exempt cap from April 2029; design details are left to secondary legislation, so every vector is an illustration at 2026/27 rates.
