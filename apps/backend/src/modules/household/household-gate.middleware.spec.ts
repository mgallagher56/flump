import { NotFoundException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { afterEach, describe, expect, it, vi } from "vitest";
import { describeException } from "../../contract/api-exception.filter";
import { HouseholdGateMiddleware } from "./household-gate.middleware";

describe("HouseholdGateMiddleware (E34 C3)", () => {
  const saved = process.env.HOUSEHOLD_ENABLED;
  afterEach(() => {
    if (saved === undefined) delete process.env.HOUSEHOLD_ENABLED;
    else process.env.HOUSEHOLD_ENABLED = saved;
  });

  const run = (method: string, originalUrl: string) => {
    const next = vi.fn() as unknown as NextFunction & ReturnType<typeof vi.fn>;
    const req = { method, originalUrl, url: "/household" } as Request;
    let thrown: unknown = null;
    try {
      new HouseholdGateMiddleware().use(req, {} as Response, next);
    } catch (err) {
      thrown = err;
    }
    return { next, thrown };
  };

  it.each([undefined, "", "false", "1", "yes", "on", "truthy"])(
    "with HOUSEHOLD_ENABLED=%s, answers like a route that does not exist and stops",
    (value) => {
      if (value === undefined) delete process.env.HOUSEHOLD_ENABLED;
      else process.env.HOUSEHOLD_ENABLED = value;
      const { next, thrown } = run("POST", "/v1/household/invitations?x=1");
      expect(next).not.toHaveBeenCalled();
      expect(thrown).toBeInstanceOf(NotFoundException);
      // Nest's own wording for an unmatched route, with the path as the client sent it.
      expect((thrown as NotFoundException).message).toBe(
        "Cannot POST /v1/household/invitations?x=1",
      );
      // Which the exception filter answers exactly as it answers an unknown route.
      expect(describeException(thrown)).toEqual({
        status: 404,
        code: "not_found",
        message: "Not found",
      });
    },
  );

  it.each(["true", "TRUE", " true "])(
    "with HOUSEHOLD_ENABLED=%j, passes the request on",
    (value) => {
      process.env.HOUSEHOLD_ENABLED = value;
      const { next, thrown } = run("GET", "/household");
      expect(thrown).toBeNull();
      expect(next).toHaveBeenCalledTimes(1);
      expect(next).toHaveBeenCalledWith();
    },
  );

  it("reads the switch on every request, so turning it off takes effect at once", () => {
    process.env.HOUSEHOLD_ENABLED = "true";
    expect(run("GET", "/household").thrown).toBeNull();
    delete process.env.HOUSEHOLD_ENABLED;
    expect(run("GET", "/household").thrown).toBeInstanceOf(NotFoundException);
  });
});
