import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isMcpUserAllowed, readMcpAccessConfig } from "../mcp-access";

/**
 * Owner-only rollout of the import pipeline (E17 re-plan section 9). It reuses the allowlist
 * settings (`MCP_ALLOWED_USER_IDS`, `MCP_OPEN_ACCESS`) but answers with a neutral 404, because
 * the same routes will serve the in-app CSV import (DECISIONS round 9, item 5), not only AI.
 * Runs after AuthGuard so `request.user` is set.
 */
@Injectable()
export class ImportsAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (isMcpUserAllowed(readMcpAccessConfig(process.env), request.user?.id)) return true;
    throw new NotFoundException({ code: "not_found", message: "Not found" });
  }
}
