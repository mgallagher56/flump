import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkOS } from "@workos-inc/node";
import { safeErrorSummary } from "../common/log-safe";

/**
 * Port decoupling user identity operations from third-party auth SDKs.
 */
export interface UserIdentityAdapter {
  updateName(userId: string, firstName?: string, lastName?: string): Promise<void>;
  /** Returns the user's own email from the identity provider, or null if unknown. */
  getUserEmail(userId: string): Promise<string | null>;
  /**
   * The user's email and name (first and last joined, null when neither is set) from the identity
   * provider, or null when the user is unknown (404) or no client is configured. Throws on any
   * other failure.
   */
  getUserContact(userId: string): Promise<UserContact | null>;
  sendPasswordReset(email: string): Promise<void>;
  /**
   * Permanently deletes the login (BE-04). Resolves when the user is gone, including when the
   * provider says it was already gone (404), so a retry is safe. Throws on any other failure.
   * Deleting the WorkOS user also ends its WorkOS sessions.
   */
  deleteUser(userId: string): Promise<void>;
  /**
   * Ends one WorkOS session (sign-out from the mobile app, E12 S2b). Resolves when the session is
   * ended, including when the provider says it is already gone (404), so a repeat is safe. Throws
   * on any other failure, and when no WorkOS client is configured.
   */
  revokeSession(sessionId: string): Promise<void>;
}

/**
 * True for the provider's "no such user" or "no such session" answer, which a retried deletion or
 * sign-out treats as done.
 */
function isIdentityNotFound(err: unknown): boolean {
  const e = err as { status?: unknown; name?: unknown } | null;
  return e?.status === 404 || e?.name === "NotFoundException";
}

export const USER_IDENTITY_ADAPTER = "USER_IDENTITY_ADAPTER";

/** A person's contact details as the identity provider holds them. Personal data: never logged. */
export interface UserContact {
  email: string;
  name: string | null;
}

/** First and last name joined with a space; null when both are blank. */
export function joinName(first?: string | null, last?: string | null): string | null {
  const name = [first, last]
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ");
  return name || null;
}

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
    } catch (err) {
      this.logger.warn(`WorkOS name sync warning: ${safeErrorSummary(err)}`);
    }
  }

  async getUserEmail(userId: string): Promise<string | null> {
    if (!this.client) return null;
    try {
      const user = await this.client.userManagement.getUser(userId);
      return user?.email ?? null;
    } catch (err: unknown) {
      if (isIdentityNotFound(err)) return null;
      throw err;
    }
  }

  async getUserContact(userId: string): Promise<UserContact | null> {
    if (!this.client) return null;
    try {
      const user = await this.client.userManagement.getUser(userId);
      if (!user?.email) return null;
      return { email: user.email, name: joinName(user.firstName, user.lastName) };
    } catch (err: unknown) {
      if (isIdentityNotFound(err)) return null;
      throw err;
    }
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

  /**
   * Throws without a client, like deleteUser: ending a session must really happen. The dev setup
   * never gets here, since the dev-bypass user carries no session id.
   */
  async revokeSession(sessionId: string): Promise<void> {
    if (!this.client) throw new Error("WorkOS client not configured");
    try {
      await this.client.userManagement.revokeSession({ sessionId });
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
  public revokedSessions: string[] = [];
  /** Set to make the next revokeSession calls fail (simulates a WorkOS outage). */
  public revokeFailure: Error | null = null;

  async updateName(userId: string, firstName?: string, lastName?: string): Promise<void> {
    this.updatedNames.push({ userId, firstName, lastName });
  }

  async getUserEmail(userId: string): Promise<string | null> {
    return this.emails.get(userId) ?? null;
  }

  /** Names by user id, read with `emails` by getUserContact. */
  public names = new Map<string, string>();

  async getUserContact(userId: string): Promise<UserContact | null> {
    const email = this.emails.get(userId);
    return email ? { email, name: this.names.get(userId) ?? null } : null;
  }

  async sendPasswordReset(email: string): Promise<void> {
    this.resetEmails.push(email);
  }

  async deleteUser(userId: string): Promise<void> {
    if (this.deleteFailure) throw this.deleteFailure;
    this.deletedUsers.push(userId);
  }

  async revokeSession(sessionId: string): Promise<void> {
    if (this.revokeFailure) throw this.revokeFailure;
    this.revokedSessions.push(sessionId);
  }
}
