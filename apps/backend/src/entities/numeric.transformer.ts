import type { ValueTransformer } from "typeorm";

/**
 * Postgres `numeric`/`decimal` columns come back from `pg` as strings. This returns them as
 * numbers (E21 decision D3-A: money is a JSON number in pounds, at most 2 decimal places;
 * E23 D-9-A, audit B-05). `null` stays `null`, so "not set" and zero stay different.
 * Writes pass through unchanged.
 */
export const numericTransformer: ValueTransformer = {
  to: (value: number | null | undefined) => value,
  from: (value: string | number | null | undefined) =>
    value === null || value === undefined ? null : Number(value),
};
