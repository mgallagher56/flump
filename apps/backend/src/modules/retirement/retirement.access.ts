import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  BETA_MEMBERSHIP_CHECK,
  type BetaMembershipCheck,
  type BetaMembershipLookup,
  isBetaAdmin,
  isBetaInviteOnly,
  isBetaOpen,
  parseList,
} from "../../auth/beta-access";

type Env = Record<string, string | undefined>;

/**
 * Retirement is a friends-beta feature (owner decision RD9). The page, GET and PUT
 * /retirement-plan and the two MCP retirement tools exist only for:
 *
 * - everyone, while the environment is in open testing (`BETA_OPEN=true`), or
 * - the WorkOS user ids listed in `RETIREMENT_ALLOWED_USER_IDS` (comma-separated), or
 * - while the beta is invite-only, its admins (`BETA_ADMIN_USER_IDS`) and active members (people
 *   who joined through an invite link).
 *
 * Anyone else must not be able to tell the feature exists: the API answers as for an unknown
 * route and the MCP tools are not registered.
 */
function isRetirementAllowedByEnv(env: Env, userId: string | undefined): boolean {
  if (isBetaOpen(env)) return true;
  if (!userId) return false;
  if (parseList(env.RETIREMENT_ALLOWED_USER_IDS, false).includes(userId)) return true;
  return isBetaInviteOnly(env) && isBetaAdmin(env, userId);
}

/** The whole rule, members included (one primary-key read when the env does not decide). */
export async function isRetirementAllowed(
  env: Env,
  userId: string | undefined,
  membership: BetaMembershipCheck,
): Promise<boolean> {
  if (isRetirementAllowedByEnv(env, userId)) return true;
  if (!userId || !isBetaInviteOnly(env)) return false;
  return membership.isActiveMember(userId);
}

/**
 * The rule for the MCP tool list, which the MCP package asks synchronously. Membership comes from
 * the lookup the same request's token check has just made (see BetaMembershipLookup).
 */
export function isRetirementToolAvailable(
  env: Env,
  userId: string | undefined,
  membership: BetaMembershipLookup,
): boolean {
  if (isRetirementAllowedByEnv(env, userId)) return true;
  if (!userId || !isBetaInviteOnly(env)) return false;
  return membership.wasActiveMemberRecently(userId);
}

/** The MCP tools that read or simulate the retirement plan, hidden with the feature. */
export { RETIREMENT_TOOL_NAMES } from "@flump/mcp";

/**
 * Runs after AuthGuard (it needs the user). A refused caller gets the same NotFoundException Nest
 * throws for a route it does not know, with the real method and path, so the answer is the same.
 */
@Injectable()
export class RetirementAccessGuard implements CanActivate {
  constructor(@Inject(BETA_MEMBERSHIP_CHECK) private readonly membership: BetaMembershipCheck) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
      user?: { id?: string };
    }>();
    if (await isRetirementAllowed(process.env, request.user?.id, this.membership)) return true;
    throw new NotFoundException(`Cannot ${request.method} ${request.originalUrl ?? request.url}`);
  }
}
