import { z } from "zod";

/** True when `v` has at most 2 decimal places. The tolerance scales with magnitude, because float error grows with it. */
export const hasAtMostTwoDecimals = (v: number): boolean => {
  const scaled = v * 100;
  return Math.abs(scaled - Math.round(scaled)) <= Math.max(1e-6, Math.abs(scaled) * 1e-12);
};

/** Money: a finite JSON number in pounds with at most 2 decimal places (E21 decision D3-A). */
export const Money = z
  .number()
  .finite()
  .refine((v) => Math.abs(v) < 1e10, "must be below 10 billion")
  .refine(hasAtMostTwoDecimals, "at most 2 decimal places");

/**
 * Non-negative money (contributions and other amounts that are never negative). Balances are
 * signed `Money`: a liability is stored negative (BE-05 stored-balance rule).
 */
export const MoneyNonNegative = Money.refine((v) => v >= 0, "must not be negative");

/** A percentage where 4.5 means 4.5% (never a fraction). Columns are numeric(5,2). */
export const Percent = z
  .number()
  .finite()
  .min(0)
  .max(100)
  .refine(hasAtMostTwoDecimals, "at most 2 decimal places");

export const Uuid = z.uuid();

/** YYYY-MM-DD with a calendar check (rejects 2026-02-30). */
export const IsoDate = z.string().refine((value) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day
  );
}, "must be a valid YYYY-MM-DD date");

/** A date-time the server can hand to `new Date()`. Accepts ISO strings only. */
export const IsoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
  message: "must be a valid ISO date-time",
});

export const Name = z.string().trim().min(1).max(120);
export const Notes = z.string().max(2000);
export const Currency = z.string().regex(/^[A-Z]{3}$/, "must be a 3-letter ISO currency code");
