// @vitest-environment node
import { AccountTypeEnum, isLiabilityType } from "./utils";

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
