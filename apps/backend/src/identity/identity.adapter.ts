import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkOS } from "@workos-inc/node";
import { safeErrorSummary } from "../log-safe";

/**
 * Port decoupling user identity operations from third-party auth SDKs.
 */
export interface UserIdentityAdapter {
  updateName(userId: string, firstName?: string, lastName?: string): Promise<void>;
  /** Returns the user's own email from the identity provider, or null if unknown. */
  getUserEmail(userId: string): Promise<string | null>;
  sendPasswordReset(email: string): Promise<void>;
  /**
   * Permanently deletes the login (BE-04). Resolves when the user is gone, including when the
   * provider says it was already gone (404), so a retry is safe. Throws on any other failure.
   * Deleting the WorkOS user also ends its WorkOS sessions.
   */
  deleteUser(userId: string): Promise<void>;
}

/** True for the provider's "no such user" answer, which a retried deletion treats as done. */
export function isIdentityNotFound(err: unknown): boolean {
  const e = err as { status?: unknown; name?: unknown } | null;
  return e?.status === 404 || e?.name === "NotFoundException";
}

export const USER_IDENTITY_ADAPTER = "USER_IDENTITY_ADAPTER";

/**
 * Production adapter communicating with WorkOS.
 */
@Injectable()
export class WorkOSIdentityAdapter implements UserIdentityAdapter {
  private readonly logger = new Logger(WorkOSIdentityAdapter.name);
  private client: WorkOS | null = null;

  constructor(private readonly configService: ConfigService) {
    const apiKey = this.configService.get<string>("WORKOS_API_KEY");
    if (apiKey) {
      this.client = new WorkOS(apiKey);
    }
  }

  async updateName(userId: string, firstName?: string, lastName?: string): Promise<void> {
    if (!this.client) return;
    try {
      await this.client.userManagement.updateUser({
        userId,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
      });
    } catch (err: any) {
      this.logger.warn(`WorkOS name sync warning: ${safeErrorSummary(err)}`);
    }
  }

  async getUserEmail(userId: string): Promise<string | null> {
    if (!this.client) return null;
    const user = await this.client.userManagement.getUser(userId);
    return user?.email ?? null;
  }

  /**
   * VERIFY BY TRIGGERING A RESET: @workos-inc/node 12.2.0 exposes only
   * `createPasswordReset({ email })` (POST /user_management/password_reset). WorkOS
   * documents it as creating a one-time token plus `password_reset_url`; there is no
   * SDK "send reset email" call. Whether WorkOS also emails the user must be confirmed
   * by triggering a reset against the real environment (see docs/security/owner-steps.md).
   * If it does not, the returned URL must be emailed by our own mailer.
   */
  async sendPasswordReset(email: string): Promise<void> {
    if (!this.client) throw new Error("WorkOS client not configured");
    await this.client.userManagement.createPasswordReset({ email });
  }

  async deleteUser(userId: string): Promise<void> {
    if (!this.client) throw new Error("WorkOS client not configured");
    try {
      await this.client.userManagement.deleteUser(userId);
    } catch (err: unknown) {
      if (isIdentityNotFound(err)) return;
      throw err;
    }
  }
}

/**
 * In-memory test fake adapter for deterministic, hermetic tests.
 */
export class InMemoryIdentityAdapter implements UserIdentityAdapter {
  public updatedNames: Array<{ userId: string; firstName?: string; lastName?: string }> = [];
  public emails = new Map<string, string>();
  public resetEmails: string[] = [];
  public deletedUsers: string[] = [];
  /** Set to make the next deleteUser calls fail (simulates a WorkOS outage). */
  public deleteFailure: Error | null = null;

  async updateName(userId: string, firstName?: string, lastName?: string): Promise<void> {
    this.updatedNames.push({ userId, firstName, lastName });
  }

  async getUserEmail(userId: string): Promise<string | null> {
    return this.emails.get(userId) ?? null;
  }

  async sendPasswordReset(email: string): Promise<void> {
    this.resetEmails.push(email);
  }

  async deleteUser(userId: string): Promise<void> {
    if (this.deleteFailure) throw this.deleteFailure;
    this.deletedUsers.push(userId);
  }
}
