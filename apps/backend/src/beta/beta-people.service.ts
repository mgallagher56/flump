import { Inject, Injectable, Logger } from "@nestjs/common";
import {
  USER_IDENTITY_ADAPTER,
  type UserContact,
  type UserIdentityAdapter,
} from "../identity/identity.adapter";

/** At most this many provider reads at once, so a long list cannot burst the provider's limit. */
const CONCURRENCY = 5;
/** One slow read leaves that person blank rather than holding the whole list. */
const LOOKUP_TIMEOUT_MS = 3_000;

const timeout = (ms: number) =>
  new Promise<never>((_, reject) => {
    const timer = setTimeout(() => reject(new Error("lookup timed out")), ms);
    timer.unref?.();
  });

/**
 * Names and email addresses for the admin's invite and member lists, read from the sign-in
 * provider by user id at request time. Nothing is stored, so there is nothing new to export or
 * erase; an erased account's provider user is deleted, so it reads as unknown. A failed or slow
 * read leaves that person blank. Logs carry counts only, never an id, an email or a name.
 */
@Injectable()
export class BetaPeopleService {
  private readonly logger = new Logger(BetaPeopleService.name);

  /** How long one read may take; a test shortens it. */
  timeoutMs = LOOKUP_TIMEOUT_MS;

  constructor(@Inject(USER_IDENTITY_ADAPTER) private readonly identity: UserIdentityAdapter) {}

  /** Contacts by user id; ids the provider does not know, or could not answer for, are absent. */
  async contactsFor(userIds: readonly string[]): Promise<Map<string, UserContact>> {
    const queue = [...new Set(userIds.filter(Boolean))];
    const contacts = new Map<string, UserContact>();
    let failed = 0;
    const worker = async () => {
      for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
        try {
          const contact = await Promise.race([
            this.identity.getUserContact(id),
            timeout(this.timeoutMs),
          ]);
          if (contact) contacts.set(id, contact);
        } catch {
          failed += 1;
        }
      }
    };
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker));
    if (failed > 0) this.logger.warn(`beta_people_lookup_failed count=${failed}`);
    return contacts;
  }
}
