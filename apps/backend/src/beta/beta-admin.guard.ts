import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { isBetaAdmin } from "../auth/beta-access";

/**
 * The beta admin routes exist only for `BETA_ADMIN_USER_IDS`. Runs after AuthGuard (it needs the
 * user). Anyone else gets the same NotFoundException Nest throws for a route it does not know,
 * with the real method and path, so nobody can tell the admin routes exist.
 */
@Injectable()
export class BetaAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<{
      method: string;
      originalUrl?: string;
      url: string;
      user?: { id?: string };
    }>();
    if (isBetaAdmin(process.env, request.user?.id)) return true;
    throw new NotFoundException(`Cannot ${request.method} ${request.originalUrl ?? request.url}`);
  }
}
