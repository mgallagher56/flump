import { monthYearSort } from './accounts';

describe('monthYearSort', () => {
  it('should sort by year', () => {
    const a = { year: 2019 };
    const b = { year: 2020 };
    expect(monthYearSort(a, b)).toEqual(-1);
    expect(monthYearSort(b, a)).toEqual(1);
  });
  it('should sort by month', () => {
    const a = { month: 1 };
    const b = { month: 2 };
    expect(monthYearSort(a, b)).toEqual(-1);
    expect(monthYearSort(b, a)).toEqual(1);
  });
  it('should sort by year and month', () => {
    const a = { year: 2019, month: 1 };
    const b = { year: 2020, month: 2 };
    expect(monthYearSort(a, b)).toEqual(-1);
    expect(monthYearSort(b, a)).toEqual(1);
  });
  it('should return 0 if equal', () => {
    const a = { year: 2019, month: 1 };
    const b = { year: 2019, month: 1 };
    expect(monthYearSort(a, b)).toEqual(0);
  });
});
