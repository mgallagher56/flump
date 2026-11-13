export const AGE_MIN = 16;
export const AGE_MAX = 100;
export const AGE_ERROR = `Enter an age between ${AGE_MIN} and ${AGE_MAX}`;

/** A typed age outside 16 to 100 or with decimals is left unset rather than failing the save. */
export const birthYearFromAge = (age: number | null, now = new Date()): number | undefined =>
  age !== null && Number.isInteger(age) && age >= AGE_MIN && age <= AGE_MAX
    ? now.getFullYear() - age
    : undefined;

/** True when an age was typed but cannot be saved. An empty age is not an error. */
export const isInvalidAge = (age: number | null): boolean =>
  age !== null && birthYearFromAge(age) === undefined;
