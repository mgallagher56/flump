import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

/**
 * Bank connection access (E19 D3-B). One switch, off for everyone except allowlisted owner
 * accounts. Reading and disconnecting existing connections is never gated.
 *
 * - `BANK_CONNECTIONS_ALLOWED_USER_IDS`: comma-separated WorkOS user ids that may connect.
 * - `BANK_CONNECTIONS_ENABLED=true`: open to every signed-in user. Defaults to off in
 *   production and on elsewhere so local development and tests keep working.
 */
export function isBankConnectionAllowed(
  env: Record<string, string | undefined>,
  userId: string | undefined,
): boolean {
  const allowed = (env.BANK_CONNECTIONS_ALLOWED_USER_IDS ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean);
  if (userId && allowed.includes(userId)) return true;

  const flag = env.BANK_CONNECTIONS_ENABLED?.trim().toLowerCase();
  if (flag === "true") return true;
  if (flag === "false") return false;
  return env.NODE_ENV !== "production";
}

@Injectable()
export class BankConnectionsEnabledGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    if (isBankConnectionAllowed(process.env, request.user?.id)) return true;
    throw new NotFoundException({
      statusCode: 404,
      error: "feature_disabled",
      message: "Bank connections are not available for this account.",
    });
  }
}
