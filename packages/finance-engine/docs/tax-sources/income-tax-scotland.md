# Scottish Income Tax bands, 2020/21 to 2026/27 (source research)

Method: WebFetch (page content summarised by a small model) on GOV.UK pages, this session. Thresholds below are in terms of income ABOVE the personal allowance (PAYE "annual earnings above the PAYE threshold"), i.e. taxable income. Each "Up to X / from X+1 to Y" is stored as the upper bound Y.
Note: gov.scot / mygov.scot pages returned 404 (UNVERIFIED from that source). Figures come from the HMRC "Rates and thresholds for employers" pages on GOV.UK, which are official.

Rates identical in all rows where band exists: starter 19%, basic 20%, intermediate 21%.

## Per-year verified figures

Source URL pattern: https://www.gov.uk/guidance/rates-and-thresholds-for-employers-YYYY-to-YYYY (the "Scottish/Scotland PAYE tax rates" table on each page).

### 2020/21 — https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2020-to-2021 (Scottish rates table; PA 12,500 noted on same page)

- Starter 19%: up to 2,085 - VERIFIED
- Basic 20%: 2,085 to 12,658 - VERIFIED
- Intermediate 21%: 12,658 to 30,930 - VERIFIED
- Higher 41%: 30,930 to 150,000 - VERIFIED
- Top 46%: above 150,000 - VERIFIED (no Advanced band)
- Personal allowance 12,500 - VERIFIED (same page)

### 2021/22 — https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2021-to-2022 (Scotland PAYE table)

- Starter 19% up to 2,097; Basic 20% to 12,726; Intermediate 21% to 31,092; Higher 41% to 150,000; Top 46% above 150,000 - each VERIFIED

### 2022/23 — https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2022-to-2023 (Scottish PAYE table; employee PA 12,570 noted)

- Starter 19% up to 2,162; Basic 20% to 13,118; Intermediate 21% to 31,092; Higher 41% to 150,000; Top 46% above 150,000 - each VERIFIED
- PA 12,570 - VERIFIED

### 2023/24 — https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2023-to-2024 (Scotland PAYE table)

- Starter 19% up to 2,162; Basic 20% to 13,118; Intermediate 21% to 31,092; Higher 42% to 125,140; Top 47% above 125,140 - each VERIFIED (no Advanced band)

### 2024/25 — https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2024-to-2025 (Scottish bands table)

- Starter 19% up to 2,306; Basic 20% to 13,991; Intermediate 21% to 31,092; Higher 42% to 62,430; Advanced 45% to 125,140; Top 48% above 125,140 - each VERIFIED

### 2025/26 — https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2025-to-2026 (Scottish bands table; PA 12,570 in tax code section)

- Starter 19% up to 2,827; Basic 20% to 14,921; Intermediate 21% to 31,092; Higher 42% to 62,430; Advanced 45% to 125,140; Top 48% above 125,140 - each VERIFIED
- PA 12,570 - VERIFIED

### 2026/27 — https://www.gov.uk/guidance/rates-and-thresholds-for-employers-2026-to-2027 (Scotland PAYE table)

- Starter 19% up to 3,967; Basic 20% to 16,956; Intermediate 21% to 31,092; Higher 42% to 62,430; Advanced 45% to 125,140; Top 48% above 125,140 - each VERIFIED
- Cross-check, https://www.gov.uk/scottish-income-tax (2026 to 2027 rates table, expressed as gross income with PA 12,570): starter to 16,537, basic to 29,526, intermediate to 43,662, higher to 75,000, advanced to 125,140, top above. Subtracting 12,570 gives 3,967 / 16,956 / 31,092 / 62,430 / 112,570 (advanced end in gross terms 125,140 = taxable 112,570 above PA; the employer page's 125,140 is a number on the same page's "earnings above threshold" column, treat the advanced/top boundary as 125,140 per both pages). VERIFIED consistent for the first four boundaries.
  - AMBIGUITY: the employer page labels advanced upper bound 125,140 as "earnings above the PAYE threshold" whereas the gov.uk/scottish-income-tax page gives 125,140 as gross income. These cannot both be taxable-above-PA readings. Repo uses 125,140 as `to` in the taxable-income-above-PA frame; I mark the advanced/top boundary as VERIFIED as a published figure of 125,140. Its frame (taxable vs gross) is moot for every vector in the catalogue (see the taper section: allowance is zero at 125,140 and above, so taxable equals gross). I recall the statutory top-rate threshold is on total income over 125,140 (MEMORY ONLY).
- Only the 2026/27 gov.uk/scottish-income-tax table was readable; that page contains only 2026/27.

## Personal allowance taper

- https://www.gov.uk/income-tax-rates/income-over-100000: PA reduces once adjusted net income exceeds 100,000, by 1 for every 2 above, reaching zero at 125,140 (for PA 12,570). Same page does not say Scotland differs. VERIFIED.
- Taper rate for 2020/21 to 2022/23: VERIFIED by ITA 2007 s.35(2)-(3) at 06/04/2020, 06/04/2021 and 06/04/2022 (one half of the excess over 100,000, allowance rounded up to a whole pound), e.g. https://www.legislation.gov.uk/ukpga/2007/3/section/35/2021-04-06.
- Taper effect on the Scottish bands (sign-off update): the GOV.UK employer pages state every Scottish band as income above the personal allowance (taxable income), for every year, so a tapered allowance does not move the band widths in taxable terms. The seven 110,000 Scottish vectors rest on that labelling plus s.35, and were recomputed independently against these tables (all match), so they are VERIFIED. No page spells out the interaction with the taper in words; the statement rests on the pages' own labelling.
- Frame of the 125,140 advanced/top boundary (and the 150,000 higher/top boundary before 2023/24) is moot for the vectors: at total income of 125,140 or more the allowance is zero (s.35), so taxable income equals gross income. Below that, taxable income is below 125,140 so the boundary is never reached. The 125,140 and 150,000 Scottish vectors (2020/21 to 2026/27) are VERIFIED on this reasoning and independent recomputation.

## Gift Aid

- https://www.gov.uk/donating-to-charity/gift-aid: higher-rate taxpayers reclaim the difference via Self Assessment or tax code; says the same applies in Scotland; gives no Scottish figures; does NOT say Gift Aid extends tax bands or reduces ANI for PA purposes. VERIFIED (what the page says / omits).
- https://www.gov.uk/income-tax-rates/income-over-100000: does not mention Gift Aid by name. VERIFIED.
- https://www.legislation.gov.uk/ukpga/2007/3/section/414 (ITA 2007 s.414, revised version, read in task G): s.414(2)(b) raises "the basic rate limit and the higher rate limit (see section 10) and additionally, in the case of a Scottish taxpayer, the upper limit for the Scottish basic rate and the limits for any Scottish rates above the Scottish basic rate" by "the grossed up amount of the gift". s.414(3) is only a cross-reference to ITTOIA 2005 s.535(7). VERIFIED (statute text). This supersedes the earlier memory note that Gift Aid extends only the Scottish intermediate band.
- Engine decision D9-B (Gift Aid only affects the allowance taper in Scotland) conflicts with that text; the owner ruling is pending (sheet ruling 2). HMRC guidance on Scottish taxpayers was not found (earlier guessed page returned 404): UNVERIFIED. Hand-derived extended-band vectors are in `UK_TAX_PENDING_OWNER_VECTORS`.

## Pages that failed

- https://www.gov.uk/government/publications/rates-and-allowances-income-tax (loaded, but only links; no tables)
- .../income-tax-rates-and-allowances-for-current-and-past-years (404, multiple attempts) - Scottish table for 2020-2025 from this page UNVERIFIED (equivalent figures verified via employer pages instead)
- https://www.gov.uk/government/publications/rates-and-allowances-income-tax/income-tax-rates-and-allowances (404)
- https://www.gov.uk/scottish-income-tax/past-years, https://www.gov.uk/guidance/rates-and-allowances-income-tax, https://www.mygov.scot/... (404 or returned only 2026/27)
- gov.scot publications (not reached; no gov.scot figures verified)

## Discrepancies vs repo

Compared repo packages/finance-engine/src/tax-rules.ts (UK_SCOTLAND_INCOME_TAX, lines 201-289), uk-tax.ts.

tax-rules.ts: all band `to` values and rates for 2020/21 to 2026/27 (lines 202-288) AGREE with the VERIFIED figures; PA 12,500 (2020/21, line 204) and 12,570 other years agree. No value discrepancies in that table. (Top-band `from` equals Advanced `to` e.g. 125,140; frame ambiguity noted above for 2024/25+ only if repo meant taxable-above-PA; for 2023/24 and 2024/25+ both pages state 125,140 so repo is consistent with the employer pages.)

uk-tax.ts calculateScottishIncomeTax (lines 232-278) is hardcoded and disagrees with year-specific verified figures (it does not read UK_SCOTLAND_INCOME_TAX):

- line 244/249: starter width 2306 (2024/25 verified); 2025/26 verified 2,827; 2026/27 verified 3,967.
- line 249: basic width 11685 = 13,991-2,306 (2024/25); 2025/26 width 12,094; 2026/27 width 12,989.
- line 254/255: intermediate start 13,991 (2024/25); 2025/26 14,921; 2026/27 16,956. Width 17101 = 31,092-13,991 only valid for 2024/25.
- line 261: higher 31,092 + width 31,338 (62,430): correct for 2024/25-2026/27, wrong for 2020/21-2023/24.
- lines 266/269: advanced band start hardcoded as gross 75,000 (assumes PA 12,570) and uses max(75000, PA) under taper, mixing gross vs taxable frames; the verified 2026/27 gross table gives 75,000 for PA 12,570 only. Effect under a tapered PA is UNVERIFIED (no source read) but the code does not shift by PA.
- Comments at lines 241-262 mix 2024/25 widths with 2026/27 gross thresholds (43,662; 75,000).
- uk-tax.ts line 83-99: Scotland marginal 48% above upper threshold and 42% above 50,270 hardcoded; 42% starts at taxable 31,092 above PA (gross 43,662 in 2026/27), not 50,270. Conflicts with verified Scottish higher band start.
