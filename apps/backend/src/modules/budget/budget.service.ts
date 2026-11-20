import {
  ACCOUNT_OWNERSHIPS,
  type AccountOwnership,
  type AddBudgetCategoryRequest,
  type CreateBudgetEntryRequest,
  MAX_BUDGET_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_BUDGET_CATEGORIES,
  type UpdateBudgetEntryRequest,
} from "@flump/api-contract";
import {
  accountFitsBudgetLink,
  BUDGET_ACCOUNT_LINK_CATEGORY,
  BUDGET_HOUSING_CATEGORY,
  defaultIsEssential,
  isBudgetAccountLink,
} from "@flump/finance-engine";
import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { withVersionClaim } from "../../contract/etag";
import {
  type KeysetOrder,
  keysetPage,
  type Page,
  type PageRequest,
} from "../../contract/pagination";
import { Account } from "../../entities/account.entity";
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { LINK_KIND_UNIQUE_INDEX } from "../../migrations/AddBudgetEntryLinkKind1795440000000";
import {
  LINK_ACCOUNT_FOREIGN_KEY,
  LINK_ACCOUNT_UNIQUE_INDEX,
} from "../../migrations/LinkBudgetLinesToAccounts1795490000000";

/** GET /budget-entries order: oldest first, id as tiebreak (keyset pagination, BE-09). */
const BUDGET_ORDER: KeysetOrder = {
  keys: [
    { column: '"b"."created_at"', kind: "timestamp" },
    { column: '"b"."id"', kind: "uuid" },
  ],
  direction: "ASC",
};

/** The entry name from `name`, or its `title` alias; undefined when neither is a non-blank string. */
function resolveEntryName(body: { name?: unknown; title?: unknown }): string | undefined {
  for (const candidate of [body.name, body.title]) {
    if (typeof candidate === "string" && candidate.trim() !== "") return candidate.trim();
  }
  return undefined;
}

/** Default share of a joint entry saved without one, as on accounts (E34). */
const DEFAULT_JOINT_SHARE_PERCENT = 50;

function validateOwnership(value: unknown): AccountOwnership | undefined {
  if (value === undefined) return undefined;
  if (typeof value === "string" && (ACCOUNT_OWNERSHIPS as readonly string[]).includes(value)) {
    return value as AccountOwnership;
  }
  throw new BadRequestException(`ownership must be one of ${ACCOUNT_OWNERSHIPS.join(", ")}`);
}

/**
 * A share as sent: a whole number from 0 to 100, or null. 0 and 100 pass here so the reply can say
 * what they mean (storedShare refuses them on a joint line); a sole line drops whatever share it
 * is sent.
 */
function validateSharePercent(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100) {
    return value;
  }
  throw new BadRequestException("sharePercent must be an integer between 1 and 99, or null");
}

/** The 400 for a share sent on a line that takes its share from its link (E34 C1, one home). */
export const LINKED_LINE_SHARE_MESSAGE =
  "A line linked to your take-home pay or to an account takes its share from there, so it cannot have its own share";
/** The 400 for a joint line at 0%. */
export const ZERO_SHARE_MESSAGE =
  "A share of 0% means none of this line is yours, so leave it out of your budget instead";
/** The 400 for a joint line at 100%. */
export const FULL_SHARE_MESSAGE =
  "A share of 100% means all of this line is yours, so mark it sole instead";

/**
 * True for a line whose share lives elsewhere (E34 C1, one home per value): take-home pay is the
 * person's own, and a savings or debt line reads its account's monthly amount already at the
 * account's share. A housing line keeps its own share (it is the home of a shared rent's share,
 * audit JO-8), and so does an unlinked line.
 */
function takesShareFromLink(linkKind: BudgetEntry["linkKind"] | undefined): boolean {
  return linkKind === "take_home" || linkKind === "savings" || linkKind === "debt";
}

/**
 * The stored pair for an entry (E34 C1). A line that takes its share from its link stores sole
 * with no share, and refuses one sent with it. Otherwise joint keeps its share (1 to 99), or 50
 * when none is given, and sole never keeps a share.
 */
function storedShare(
  linkKind: BudgetEntry["linkKind"] | undefined,
  ownership: AccountOwnership,
  sharePercent: number | null | undefined,
  sent: { ownership: AccountOwnership | undefined; sharePercent: number | null | undefined },
): { ownership: AccountOwnership; sharePercent: number | null } {
  if (takesShareFromLink(linkKind)) {
    if (
      sent.ownership === "joint" ||
      (sent.sharePercent !== undefined && sent.sharePercent !== null)
    ) {
      throw new BadRequestException(LINKED_LINE_SHARE_MESSAGE);
    }
    return { ownership: "sole", sharePercent: null };
  }
  if (ownership !== "joint") return { ownership: "sole", sharePercent: null };
  const share = sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT;
  if (share === 0) throw new BadRequestException(ZERO_SHARE_MESSAGE);
  if (share === 100) throw new BadRequestException(FULL_SHARE_MESSAGE);
  return { ownership: "joint", sharePercent: share };
}

/** Budget entries and custom categories (BE-13, audit M19): the logic the controller used to hold. */
@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(BudgetEntry)
    private readonly budgetEntryRepository: Repository<BudgetEntry>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
    @InjectRepository(Account)
    private readonly accountRepository: Repository<Account>,
  ) {}

  /** One keyset page of the user's entries; the entity's numeric transformer returns `amount` as a number. */
  async listEntries(userId: string, page: PageRequest): Promise<Page<BudgetEntry>> {
    const qb = this.budgetEntryRepository
      .createQueryBuilder("b")
      .where("b.userId = :userId", { userId });
    return keysetPage(qb, BUDGET_ORDER, page);
  }

  async addCustomCategory(
    userId: string,
    body: AddBudgetCategoryRequest,
  ): Promise<{ success: boolean; categories: string[] }> {
    const catName = body?.category?.trim();
    if (!catName) {
      throw new BadRequestException("Category name is required");
    }
    if (catName.length > MAX_BUDGET_CATEGORY_NAME_LENGTH) {
      throw new BadRequestException(
        `Category name may be at most ${MAX_BUDGET_CATEGORY_NAME_LENGTH} characters`,
      );
    }

    let profile = await this.userProfileRepository.findOne({ where: { userId } });
    if (!profile) {
      profile = this.userProfileRepository.create({ userId });
    }

    const currentCategories = Array.isArray(profile.customBudgetCategories)
      ? [...profile.customBudgetCategories]
      : [];

    const normalized = catName.toLowerCase();
    if (!currentCategories.includes(normalized)) {
      // Audit L2: the list lives on the profile row, so it is capped. Re-adding an existing
      // category stays a no-op success even at the cap.
      if (currentCategories.length >= MAX_CUSTOM_BUDGET_CATEGORIES) {
        throw new BadRequestException(
          `At most ${MAX_CUSTOM_BUDGET_CATEGORIES} custom budget categories are allowed`,
        );
      }
      currentCategories.push(normalized);
      profile.customBudgetCategories = currentCategories;
      await this.userProfileRepository.save(profile);
    }

    return { success: true, categories: profile.customBudgetCategories ?? [] };
  }

  async createEntry(userId: string, body: CreateBudgetEntryRequest): Promise<BudgetEntry> {
    const name = resolveEntryName(body);
    if (name === undefined) {
      throw new BadRequestException("Budget entry name is required");
    }
    const ownership = validateOwnership(body.ownership);
    const sharePercent = validateSharePercent(body.sharePercent);
    const share = storedShare(body.linkKind, ownership ?? "sole", sharePercent, {
      ownership,
      sharePercent,
    });
    const entry = this.budgetEntryRepository.create({
      userId,
      category: body.category,
      name,
      amount: body.amount,
      frequency: body.frequency ?? "monthly",
      isIncome: body.isIncome ?? false,
      isPrimaryIncome: false,
      // Savings rows are off unless the person marks one (owner item 28); other rows stay on.
      isEssential: body.isEssential ?? defaultIsEssential(body.category, body.isIncome ?? false),
      notes: body.notes ?? null,
      isDefault: false,
      linkKind: body.linkKind ?? null,
      linkAccountId: body.linkAccountId ?? null,
      ...share,
    });
    await assertLinkable(this.budgetEntryRepository, this.accountRepository, userId, entry);
    if (entry.linkKind) {
      // A linked line stores no amount of its own: the stored 0 is never read.
      entry.amount = 0;
    }
    try {
      return await this.budgetEntryRepository.save(entry);
    } catch (err) {
      throw linkWriteError(err);
    }
  }

  /** Conditional on `expected` when given (412 when stale, BE-09). */
  async updateEntry(
    userId: string,
    id: string,
    body: UpdateBudgetEntryRequest,
    expected: Date | undefined,
  ): Promise<BudgetEntry> {
    return withVersionClaim(
      this.budgetEntryRepository,
      { id, user_id: userId },
      expected,
      () => new NotFoundException("Budget entry not found"),
      (repository) => this.applyBudgetUpdate(repository, userId, id, body),
    );
  }

  private async applyBudgetUpdate(
    repository: Repository<BudgetEntry>,
    userId: string,
    id: string,
    body: UpdateBudgetEntryRequest,
  ): Promise<BudgetEntry> {
    // Checked before the lookup so a bad value never reaches the row.
    const ownership = validateOwnership(body.ownership);
    const sharePercent = validateSharePercent(body.sharePercent);
    const entry = await repository.findOne({ where: { id, userId } });

    if (!entry) {
      throw new NotFoundException("Budget entry not found");
    }
    // Worked out before any field changes so a refused share never reaches the row. Omitted
    // ownership and share stay as saved; an explicit null share on a joint entry is 50. Linking a
    // joint row to take-home pay or an account clears its share (the link's share replaces it).
    const share = storedShare(
      body.linkKind !== undefined ? body.linkKind : entry.linkKind,
      (ownership ?? entry.ownership) === "joint" ? "joint" : "sole",
      sharePercent !== undefined ? sharePercent : entry.sharePercent,
      { ownership, sharePercent },
    );

    if (body.category !== undefined) entry.category = body.category;
    if (body.name !== undefined || body.title !== undefined) {
      const name = resolveEntryName(body);
      if (name === undefined) throw new BadRequestException("Budget entry name cannot be blank");
      entry.name = name;
    }
    if (body.amount !== undefined) entry.amount = body.amount;
    if (body.frequency !== undefined) entry.frequency = body.frequency;
    if (body.isIncome !== undefined) entry.isIncome = body.isIncome;
    if (body.isEssential !== undefined) entry.isEssential = body.isEssential;
    if (body.notes !== undefined) entry.notes = body.notes ?? null;
    if (body.linkKind !== undefined) {
      entry.linkKind = body.linkKind;
      // Unlinking, or linking to a profile fact, drops the account unless the body names one
      // (which assertLinkable then refuses): only a savings or debt line reads an account.
      if (!isBudgetAccountLink(body.linkKind) && body.linkAccountId === undefined) {
        entry.linkAccountId = null;
      }
    }
    if (body.linkAccountId !== undefined) entry.linkAccountId = body.linkAccountId;
    // A savings or debt line whose account was deleted or changed type reads "Not set". Editing
    // its name, notes or essential flag leaves the link as it is, so the account is checked only
    // when the link, the category or the income flag changes.
    const linkTouched =
      body.linkKind !== undefined ||
      body.linkAccountId !== undefined ||
      body.category !== undefined ||
      body.isIncome !== undefined;
    if (linkTouched || !isBudgetAccountLink(entry.linkKind)) {
      await assertLinkable(repository, this.accountRepository, userId, entry);
    }
    if (entry.linkKind) {
      // A linked line stores no amount of its own: the stored 0 is never read.
      entry.amount = 0;
    }
    Object.assign(entry, share);

    try {
      return await repository.save(entry);
    } catch (err) {
      throw linkWriteError(err);
    }
  }

  async deleteEntry(userId: string, id: string): Promise<{ success: boolean }> {
    const entry = await this.budgetEntryRepository.findOne({ where: { id, userId } });

    if (!entry) {
      throw new NotFoundException("Budget entry not found");
    }

    await this.budgetEntryRepository.remove(entry);
    return { success: true };
  }
}

/**
 * A line may be linked only to a fact of its own kind (take-home pay on an income line, housing on
 * a spending line in the housing category, an account's monthly saving on a savings line, its
 * monthly payment on a debt line), and to a fact no other line of the user's is linked to: the
 * engine resolves one line per profile fact and one per account.
 *
 * A savings or debt line must name one of the caller's own accounts (audit slice 5). Another
 * user's account id is refused exactly as a missing one is (404), so the reply never says whether
 * the id exists. The account must be a savings or investment account for a savings line, and a
 * card, loan or overdraft for a debt line. No other line may name an account.
 */
async function assertLinkable(
  repository: Repository<BudgetEntry>,
  accounts: Repository<Account>,
  userId: string,
  entry: BudgetEntry,
): Promise<void> {
  const kind = entry.linkKind;
  if (!isBudgetAccountLink(kind)) {
    if (entry.linkAccountId !== null && entry.linkAccountId !== undefined) {
      throw new BadRequestException("Only a savings or debt line can be linked to an account");
    }
    entry.linkAccountId = null;
    if (!kind) return;
    const fits =
      kind === "take_home"
        ? entry.isIncome
        : !entry.isIncome && entry.category === BUDGET_HOUSING_CATEGORY;
    if (!fits) {
      throw new BadRequestException(
        kind === "take_home"
          ? "Only an income line can use your take-home pay"
          : "Only a housing line can use your saved housing payment",
      );
    }
    const others = await repository.find({
      where: { userId, linkKind: kind },
      select: { id: true },
    });
    if (others.some((other) => other.id !== entry.id)) {
      throw new BadRequestException(LINK_TAKEN_MESSAGE);
    }
    return;
  }

  if (entry.isIncome || entry.category !== BUDGET_ACCOUNT_LINK_CATEGORY[kind]) {
    throw new BadRequestException(
      kind === "savings"
        ? "Only a line in Savings can use an account's monthly saving"
        : "Only a line in Debt can use an account's monthly payment",
    );
  }
  if (!entry.linkAccountId) {
    throw new BadRequestException("Choose the account this line uses");
  }
  // Scoped to the caller: another user's account is not found, never linked.
  const account = await accounts.findOne({
    where: { id: entry.linkAccountId, userId },
    select: { id: true, type: true },
  });
  if (!account) throw new NotFoundException("Account not found");
  if (!accountFitsBudgetLink(kind, account.type)) {
    throw new BadRequestException(
      kind === "savings"
        ? "Only a savings or investment account can be used for a savings line"
        : "Only a card, loan or overdraft can be used for a debt line",
    );
  }
  const others = await repository.find({
    where: { userId, linkAccountId: entry.linkAccountId },
    select: { id: true },
  });
  if (others.some((other) => other.id !== entry.id)) {
    throw new BadRequestException(LINK_ACCOUNT_TAKEN_MESSAGE);
  }
}

const LINK_TAKEN_MESSAGE = "Another line already uses this saved figure";
const LINK_ACCOUNT_TAKEN_MESSAGE = "Another line already uses this account";

/** The Postgres error code and constraint of a failed write, from TypeORM's wrapper or the driver. */
function pgError(err: unknown): { code?: string; constraint?: string } {
  if (!err || typeof err !== "object") return {};
  const e = err as {
    code?: string;
    constraint?: string;
    driverError?: { code?: string; constraint?: string };
  };
  return {
    code: e.code ?? e.driverError?.code,
    constraint: e.constraint ?? e.driverError?.constraint,
  };
}

/**
 * A write that raced past `assertLinkable` and hit the database's own guard: the one-line-per-fact
 * or one-line-per-account index (400), or the account foreign key, which fires when the account
 * was deleted in between or (never through the checks above) belongs to someone else (404, as
 * for any account the caller does not have). Any other error is returned unchanged.
 */
function linkWriteError(err: unknown): unknown {
  const { code, constraint } = pgError(err);
  if (code === "23505" && constraint === LINK_KIND_UNIQUE_INDEX) {
    return new BadRequestException(LINK_TAKEN_MESSAGE);
  }
  if (code === "23505" && constraint === LINK_ACCOUNT_UNIQUE_INDEX) {
    return new BadRequestException(LINK_ACCOUNT_TAKEN_MESSAGE);
  }
  if (code === "23503" && constraint === LINK_ACCOUNT_FOREIGN_KEY) {
    return new NotFoundException("Account not found");
  }
  return err;
}
