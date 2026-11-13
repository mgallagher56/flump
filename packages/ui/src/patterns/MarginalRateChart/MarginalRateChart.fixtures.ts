import type {
  MarginalRatePoint,
  MarginalRateSteppedZone,
  MarginalRateThresholdMarker,
} from "./MarginalRateChart";

/** Simplified 2026/27 England curve for stories and tests (no engine import in patterns). */
const rateAt = (g: number): number => {
  if (g < 12_570) return 0;
  if (g < 50_270) return 28;
  if (g < 60_000) return 42;
  if (g < 80_000) return 42 + 11;
  if (g < 100_000) return 42;
  if (g < 125_140) return 62;
  return 47;
};

export const SAMPLE_POINTS: MarginalRatePoint[] = Array.from({ length: 601 }, (_, i) => {
  const gross = i * 250;
  return { gross, ratePct: rateAt(gross) };
});

export const SAMPLE_THRESHOLDS: MarginalRateThresholdMarker[] = [
  { gross: 12_570, label: "Income Tax starts" },
  { gross: 12_570, label: "National Insurance starts" },
  { gross: 50_270, label: "Higher rate (40%)" },
  { gross: 50_270, label: "National Insurance upper limit" },
  { gross: 60_000, label: "Child Benefit charge starts" },
  { gross: 80_000, label: "Child Benefit charge reaches 100%" },
  { gross: 100_000, label: "Personal Allowance starts to reduce" },
  { gross: 125_140, label: "Personal Allowance fully reduced" },
  { gross: 125_140, label: "Additional rate (45%)" },
];

export const SAMPLE_ZONES: MarginalRateSteppedZone[] = [
  { from: 60_000, to: 80_000, label: "Child Benefit charge, in steps" },
];

export const SAMPLE_SUMMARY =
  "The estimated share of the next £1,000 of pay that is deducted, at each gross pay from £0 to £150,000. At your pay of £39,000, it is an estimated 28%.";
