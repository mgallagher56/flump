import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { AuthGuard } from "../../auth/auth.guard";
import { RetirementAccessGuard } from "./retirement.access";
import { RetirementController } from "./retirement.controller";

describe("RetirementController guards (RD9)", () => {
  it("checks the friends-beta gate on every route, after sign-in", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, RetirementController)).toEqual([
      AuthGuard,
      RetirementAccessGuard,
    ]);
  });
});
