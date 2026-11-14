import {
  type AddBudgetCategoryRequest,
  type CreateBudgetEntryRequest,
  MAX_BUDGET_CATEGORY_NAME_LENGTH,
  MAX_CUSTOM_BUDGET_CATEGORIES,
  type UpdateBudgetEntryRequest,
} from "@flump/api-contract";
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

/** GET /budget-entries order: oldest first, id as tiebreak (keyset pagination, BE-09). */
const BUDGET_ORDER: KeysetOrder = {
  keys: [
    { column: '"b"."created_at"', kind: "timestamp" },
    { column: '"b"."id"', kind: "uuid" },
  ],
  direction: "ASC",
};

type BudgetCategory = "housing" | "bills" | "expenses" | "savings" | "income" | string;
type BudgetFrequency = "monthly" | "annual" | "weekly";

interface DefaultSeed {
  category: BudgetCategory;
  name: string;
  amount: number;
  frequency: BudgetFrequency;
  isIncome: boolean;
  isPrimaryIncome: boolean;
  isEssential: boolean;
  isDefault: boolean;
}

/**
 * Suggested rows are names only. Amounts start at 0 so no invented figure ever reaches the
 * budget totals, safe to spend or months of cover (E23); the person fills in their own.
 */
const DEFAULT_BUDGET_SEEDS: DefaultSeed[] = [
  {
    category: "housing",
    name: "Rent / Mortgage",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "housing",
    name: "Home Insurance",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Electricity",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Gas",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Water",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Council Tax",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Broadband",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Mobile Phone",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Gym",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: false,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Netflix",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: false,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Spotify",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: false,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Car Insurance",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "savings",
    name: "Emergency Fund",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "savings",
    name: "ISA / Investments",
    amount: 0,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
];

/** The entry name from `name`, or its `title` alias; undefined when neither is a non-blank string. */
function resolveEntryName(body: { name?: unknown; title?: unknown }): string | undefined {
  for (const candidate of [body.name, body.title]) {
    if (typeof candidate === "string" && candidate.trim() !== "") return candidate.trim();
  }
  return undefined;
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
   * Explicit opt-in only (POST budget-entries/seed-defaults). Idempotent: a template the user
   * already has (same name, isDefault true) is skipped. Returns every entry, oldest first.
   */
  async seedDefaults(userId: string): Promise<BudgetEntry[]> {
    const existing = await this.budgetEntryRepository.find({ where: { userId } });
    const haveDefault = new Set(existing.filter((e) => e.isDefault).map((e) => e.name));
    const toCreate = DEFAULT_BUDGET_SEEDS.filter((seed) => !haveDefault.has(seed.name)).map(
      (seed) => this.budgetEntryRepository.create({ ...seed, userId }),
    );
    if (toCreate.length > 0) await this.budgetEntryRepository.save(toCreate);
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
    const entry = this.budgetEntryRepository.create({
      userId,
      category: body.category,
      name,
      amount: body.amount,
      frequency: body.frequency ?? "monthly",
      isIncome: body.isIncome ?? false,
      isPrimaryIncome: false,
      isEssential: body.isEssential ?? true,
      notes: body.notes ?? null,
      isDefault: false,
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

    return repository.save(entry);
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
