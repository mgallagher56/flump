import { AccountTypeEnum, isLiabilityType, toDisplayBalance } from "./utils";

describe("isLiabilityType", () => {
  test.each([AccountTypeEnum.STUDENT_LOAN, AccountTypeEnum.OVERDRAFT, AccountTypeEnum.MORTGAGE])(
    "treats %s as a liability",
    (type) => {
      expect(isLiabilityType(type)).toBe(true);
    },
  );

  test("treats Property and Current as assets", () => {
    expect(isLiabilityType(AccountTypeEnum.PROPERTY)).toBe(false);
    expect(isLiabilityType(AccountTypeEnum.CURRENT)).toBe(false);
    expect(isLiabilityType(undefined)).toBe(false);
  });
});

describe("toDisplayBalance", () => {
  test("shows student loan and overdraft as the positive amount owed", () => {
    expect(toDisplayBalance(AccountTypeEnum.STUDENT_LOAN, -40000)).toBe(40000);
    expect(toDisplayBalance(AccountTypeEnum.OVERDRAFT, -300)).toBe(300);
  });

  test("leaves property unchanged", () => {
    expect(toDisplayBalance(AccountTypeEnum.PROPERTY, 250000)).toBe(250000);
  });

  test("passes undefined through", () => {
    expect(toDisplayBalance(AccountTypeEnum.STUDENT_LOAN, undefined)).toBeUndefined();
  });
});
