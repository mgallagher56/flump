import {
  ACCOUNT_OWNERSHIPS,
  type AccountOwnership,
  type AddBudgetCategoryRequest,
  type CreateBudgetEntryRequest,
  MAX_BUDGET_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_BUDGET_CATEGORIES,
  type UpdateBudgetEntryRequest,
} from "@flump/api-contract";
import { BUDGET_HOUSING_CATEGORY, defaultIsEssential } from "@flump/finance-engine";
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
import { BudgetEntry } from "../../entities/budget-entry.entity";
import { UserProfile } from "../../entities/user-profile.entity";
import { LINK_KIND_UNIQUE_INDEX } from "../../migrations/AddBudgetEntryLinkKind1795440000000";

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

function validateSharePercent(value: unknown): number | null | undefined {
  if (value === undefined || value === null) return value;
  if (typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100) {
    return value;
  }
  throw new BadRequestException("sharePercent must be an integer between 1 and 100, or null");
}

/**
 * The stored pair for an entry (E34 C1, the accounts rule): joint keeps its share, or 50 when
 * none is given; sole never keeps a share.
 */
function storedShare(
  ownership: AccountOwnership,
  sharePercent: number | null | undefined,
): { ownership: AccountOwnership; sharePercent: number | null } {
  return ownership === "joint"
    ? { ownership, sharePercent: sharePercent ?? DEFAULT_JOINT_SHARE_PERCENT }
    : { ownership: "sole", sharePercent: null };
}

/** Budget entries and custom categories (BE-13, audit M19): the logic the controller used to hold. */
@Injectable()
export class BudgetService {
  constructor(
    @InjectRepository(BudgetEntry)
    private readonly budgetEntryRepository: Repository<BudgetEntry>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  /** One keyset page of the user's entries; the entity's numeric transformer returns `amount` as a number. */
  async listEntries(userId: string, page: PageRequest): Promise<Page<BudgetEntry>> {
    const qb = this.budgetEntryRepository
      .createQueryBuilder("b")
      .where("b.userId = :userId", { userId });
    return keysetPage(qb, BUDGET_ORDER, page);
  }

  /**
   * POST budget-entries/seed-defaults, kept so older clients still get the list back. It creates
   * nothing: the £0 suggestion rows it used to add ("Rent / Mortgage", "Emergency Fund", "ISA /
   * Investments") showed as empty lines in the budget (owner item 33a), and the wizard's common
   * entries now cover the same ground with the person's own amounts. Returns every entry, oldest
   * first.
   */
  async seedDefaults(userId: string): Promise<BudgetEntry[]> {
    return this.budgetEntryRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });
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
    const share = storedShare(
      validateOwnership(body.ownership) ?? "sole",
      validateSharePercent(body.sharePercent),
    );
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
      ...share,
    });
    return this.budgetEntryRepository.save(entry);
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
    if (body.linkKind !== undefined) entry.linkKind = body.linkKind;
    if (entry.linkKind) {
      await assertLinkable(repository, userId, entry);
      // A linked line stores no amount of its own: the stored 0 is never read.
      entry.amount = 0;
    }
    // Omitted ownership and share stay as saved; an explicit null share on a joint entry is 50.
    const nextOwnership: AccountOwnership =
      (ownership ?? entry.ownership) === "joint" ? "joint" : "sole";
    const nextShare = sharePercent !== undefined ? sharePercent : entry.sharePercent;
    Object.assign(entry, storedShare(nextOwnership, nextShare));

    try {
      return await repository.save(entry);
    } catch (err) {
      // Two writes raced past the check above: the unique index keeps one line per fact.
      if (isLinkKindUniqueViolation(err)) throw new BadRequestException(LINK_TAKEN_MESSAGE);
      throw err;
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
 * a spending line in the housing category), and to a fact no other line of the user's is linked to:
 * the engine resolves one line per kind.
 */
async function assertLinkable(
  repository: Repository<BudgetEntry>,
  userId: string,
  entry: BudgetEntry,
): Promise<void> {
  const fits =
    entry.linkKind === "take_home"
      ? entry.isIncome
      : !entry.isIncome && entry.category === BUDGET_HOUSING_CATEGORY;
  if (!fits) {
    throw new BadRequestException(
      entry.linkKind === "take_home"
        ? "Only an income line can use your take-home pay"
        : "Only a housing line can use your saved housing payment",
    );
  }
  const others = await repository.find({
    where: { userId, linkKind: entry.linkKind ?? undefined },
    select: { id: true },
  });
  if (others.some((other) => other.id !== entry.id)) {
    throw new BadRequestException(LINK_TAKEN_MESSAGE);
  }
}

const LINK_TAKEN_MESSAGE = "Another line already uses this saved figure";

/** The one-line-per-fact unique index firing (AddBudgetEntryLinkKind1795440000000). */
function isLinkKindUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== "object") return false;
  const e = err as {
    code?: string;
    constraint?: string;
    driverError?: { code?: string; constraint?: string };
  };
  const code = e.code ?? e.driverError?.code;
  const constraint = e.constraint ?? e.driverError?.constraint;
  return code === "23505" && constraint === LINK_KIND_UNIQUE_INDEX;
}
