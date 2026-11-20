import "reflect-metadata";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { describe, expect, it } from "vitest";
import { AuthGuard } from "../../auth/auth.guard";
import { RetirementController } from "./retirement.controller";

describe("RetirementController guards", () => {
  it("has only the AuthGuard: open to everyone the beta lets in (owner, 20 Nov 2026)", () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, RetirementController)).toEqual([AuthGuard]);
  });
});
