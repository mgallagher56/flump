import { Injectable, type NestMiddleware, NotFoundException } from "@nestjs/common";
import type { NextFunction, Request, Response } from "express";
import { isHouseholdEnabled } from "../../config/household-gate";

/**
 * The household switch on the routes (E34 C3). Applied to HouseholdController only, in
 * HouseholdModule.configure(). Middleware runs before every guard, interceptor and pipe (the per-IP
 * limit, the AuthGuard, the contract check), so with the switch off a household route, signed in or
 * not and with any body, gets exactly what Nest gives a route that does not exist: the same
 * "Cannot METHOD /path" 404, which the exception filter turns into `not_found` "Not found". The
 * routes stay registered so the manifest and authorisation coverage tests still see them.
 *
 * The switch is read on every request, never cached, so turning it off takes effect at once.
 */
@Injectable()
export class HouseholdGateMiddleware implements NestMiddleware {
  use(req: Request, _res: Response, next: NextFunction): void {
    if (!isHouseholdEnabled(process.env)) {
      throw new NotFoundException(`Cannot ${req.method} ${req.originalUrl}`);
    }
    next();
  }
}
