import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { WorkOS } from "@workos-inc/node";

/**
 * Port decoupling user identity operations from third-party auth SDKs.
 */
export interface UserIdentityAdapter {
  updateName(userId: string, firstName?: string, lastName?: string): Promise<void>;
  /** Returns the user's own email from the identity provider, or null if unknown. */
  getUserEmail(userId: string): Promise<string | null>;
  sendPasswordReset(email: string): Promise<void>;
}

export const USER_IDENTITY_ADAPTER = "USER_IDENTITY_ADAPTER";

/**
 * Production adapter communicating with WorkOS.
 */
@Injectable()
export class WorkOSIdentityAdapter implements UserIdentityAdapter {
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
      console.warn("WorkOS name sync warning:", err?.message || err);
    }
  }

  async getUserEmail(userId: string): Promise<string | null> {
    if (!this.client) return null;
    const user = await this.client.userManagement.getUser(userId);
    return user?.email ?? null;
  }

  async sendPasswordReset(email: string): Promise<void> {
    if (!this.client) return;
    await this.client.userManagement.createPasswordReset({ email });
  }
}

/**
 * In-memory test fake adapter for deterministic, hermetic tests.
 */
export class InMemoryIdentityAdapter implements UserIdentityAdapter {
  public updatedNames: Array<{ userId: string; firstName?: string; lastName?: string }> = [];
  public emails = new Map<string, string>();
  public resetEmails: string[] = [];

  async updateName(userId: string, firstName?: string, lastName?: string): Promise<void> {
    this.updatedNames.push({ userId, firstName, lastName });
  }

  async getUserEmail(userId: string): Promise<string | null> {
    return this.emails.get(userId) ?? null;
  }

  async sendPasswordReset(email: string): Promise<void> {
    this.resetEmails.push(email);
  }
}
