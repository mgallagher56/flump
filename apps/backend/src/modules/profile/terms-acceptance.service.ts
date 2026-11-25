import type { LegalDocumentStatus, TermsStatusResponse } from "@flump/api-contract";
import {
  type AcceptanceDocument,
  LEGAL_PAGES,
  type LegalPage,
  pageIn,
  versionInEffect,
  versionsAtLeastInEffect,
} from "@flump/business-details";
import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, type Repository } from "typeorm";
import type { TermsAcceptanceCheck } from "../../auth/terms-acceptance";
import { TermsAcceptance } from "../../entities/terms-acceptance.entity";

/** At most this many positive results are cached per process; the oldest go first. */
const CACHE_LIMIT = 10_000;
/** How long a positive result is trusted before the table is read again. */
export const AGREED_CACHE_MS = 30_000;

/** The newest version of each page: what the person is shown and what an agreement records. */
export function newestPair(pages: readonly LegalPage[] = LEGAL_PAGES): {
  termsVersion: string;
  privacyNoticeVersion: string;
} {
  return {
    termsVersion: pageIn(pages, "terms").version,
    privacyNoticeVersion: pageIn(pages, "privacy").version,
  };
}

/**
 * Terms acceptance: whether a person has agreed to the terms of use in force (with the privacy
 * notice in force shown), and recording that they have. Versions come from `LEGAL_PAGES`
 * (`@flump/business-details`), the one home of the legal pages' versions.
 *
 * An agreement to a version newer than the one in force counts (someone who agreed early is not
 * asked again when it comes into force). The AuthGuard calls `hasAgreedToTermsInForce` on every
 * authenticated request: one read by user id, served by the table's primary key. Only a positive
 * answer is cached, for 30 seconds, keyed by the user and the pair in force, so a version coming
 * into force (a new pair) is never answered from the cache, and a refusal is never cached. Erasure
 * is caught by the guard's erased-account check before this one, so a cached "agreed" cannot
 * outlive the account; the time limit covers a row removed by hand.
 */
@Injectable()
export class TermsAcceptanceService implements TermsAcceptanceCheck {
  /** Positive results only, keyed by user and the pair in force, with when each stops counting. */
  private readonly agreed = new Map<string, number>();
  /** The legal pages and their versions. A test may set another list (a version coming up). */
  pages: readonly LegalPage[] = LEGAL_PAGES;

  constructor(
    @InjectRepository(TermsAcceptance)
    private readonly repository: Repository<TermsAcceptance>,
  ) {}

  async hasAgreedToTermsInForce(userId: string, now: Date = new Date()): Promise<boolean> {
    const terms = versionInEffect("terms", now, this.pages).version;
    const privacy = versionInEffect("privacy", now, this.pages).version;
    const key = `${userId}\u0000${terms}\u0000${privacy}`;
    const until = this.agreed.get(key);
    if (until !== undefined && until > now.getTime()) return true;
    this.agreed.delete(key);
    // Throws on a failed read; the guard turns that into 503.
    const count = await this.repository.count({
      where: {
        userId,
        termsVersionAgreed: In(versionsAtLeastInEffect("terms", now, this.pages)),
        privacyNoticeVersionShown: In(versionsAtLeastInEffect("privacy", now, this.pages)),
      },
    });
    if (count === 0) return false;
    if (this.agreed.size >= CACHE_LIMIT) {
      const oldest = this.agreed.keys().next().value;
      if (oldest !== undefined) this.agreed.delete(oldest);
    }
    this.agreed.set(key, now.getTime() + AGREED_CACHE_MS);
    return true;
  }

  /** What GET /user-profile/terms-acceptance answers. */
  async status(userId: string, now: Date = new Date()): Promise<TermsStatusResponse> {
    const rows = await this.repository.find({
      where: { userId },
      order: { acceptedAt: "DESC" },
    });
    const newest = newestPair(this.pages);
    const latest = rows[0];
    const required = !(await this.hasAgreedToTermsInForce(userId, now));
    const agreed = rows.some(
      (row) =>
        row.termsVersionAgreed === newest.termsVersion &&
        row.privacyNoticeVersionShown === newest.privacyNoticeVersion,
    );
    const document = (key: AcceptanceDocument, last: string | undefined): LegalDocumentStatus => {
      const page = pageIn(this.pages, key);
      const [current] = page.history;
      if (!current) throw new Error(`Legal page ${key} has no version`);
      return {
        version: current.version,
        updated: current.updated,
        effectiveFrom: current.effectiveFrom,
        path: page.path,
        changed: last !== undefined && last !== current.version,
      };
    };
    return {
      required,
      agreed,
      firstTime: rows.length === 0,
      terms: document("terms", latest?.termsVersionAgreed),
      privacyNotice: document("privacy", latest?.privacyNoticeVersionShown),
    };
  }

  /**
   * Records an agreement to the newest pair. The caller has checked that the versions sent are the
   * newest. Idempotent: the primary key is the user and the pair, so a repeat (or a concurrent
   * double submit) writes nothing. The insert runs in a transaction, inside the user-data write
   * fence like every write of a signed-in request, so it cannot recreate a row during an erasure.
   */
  async accept(
    userId: string,
    pair: { termsVersion: string; privacyNoticeVersion: string },
  ): Promise<{ recorded: boolean }> {
    // In a transaction, so the user-data write fence takes its lock first (it refuses a bare insert
    // into a user table during a signed-in request).
    const result = await this.repository.manager.transaction((manager) =>
      manager
        .createQueryBuilder()
        .insert()
        .into(TermsAcceptance)
        .values({
          userId,
          termsVersionAgreed: pair.termsVersion,
          privacyNoticeVersionShown: pair.privacyNoticeVersion,
        })
        .orIgnore()
        .execute(),
    );
    const recorded = (result.raw as unknown[]).length > 0;
    return { recorded };
  }
}
