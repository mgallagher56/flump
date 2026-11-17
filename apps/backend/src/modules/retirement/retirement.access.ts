import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isBetaOpen, parseList } from "../../auth/beta-access";

/**
 * Retirement is a friends-beta feature (owner decision RD9). The page, GET and PUT
 * /retirement-plan and the two MCP retirement tools exist only for:
 *
 * - everyone, while the environment is in open testing (`BETA_OPEN=true`), or
 * - the WorkOS user ids listed in `RETIREMENT_ALLOWED_USER_IDS` (comma-separated).
 *
 * Anyone else must not be able to tell the feature exists: the API answers as for an unknown
 * route and the MCP tools are not registered.
 */
export function isRetirementAllowed(
  env: Record<string, string | undefined>,
  userId: string | undefined,
): boolean {
  if (isBetaOpen(env)) return true;
  return !!userId && parseList(env.RETIREMENT_ALLOWED_USER_IDS, false).includes(userId);
}

/** The MCP tools that read or simulate the retirement plan, hidden with the feature. */
export const RETIREMENT_TOOL_NAMES: ReadonlySet<string> = new Set([
  "get_retirement_picture",
  "simulate_retirement",
]);

/**
 * Runs after AuthGuard (it needs the user). A refused caller gets the same NotFoundException Nest
 * throws for a route it does not know, with the real method and path, so the answer is the same.
 */
@Injectable()
export class RetirementAccessGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
      user?: { id?: string };
    }>();
    if (isRetirementAllowed(process.env, request.user?.id)) return true;
    throw new NotFoundException(`Cannot ${request.method} ${request.originalUrl ?? request.url}`);
  }
}
