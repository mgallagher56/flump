import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthGuard } from "./auth/auth.guard";
import { BudgetEntry } from "./entities/budget-entry.entity";
import { UserProfile } from "./entities/user-profile.entity";

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

const DEFAULT_BUDGET_SEEDS: DefaultSeed[] = [
  {
    category: "housing",
    name: "Rent / Mortgage",
    amount: 1200,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "housing",
    name: "Home Insurance",
    amount: 30,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Electricity",
    amount: 80,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Gas",
    amount: 60,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Water",
    amount: 30,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Council Tax",
    amount: 150,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "bills",
    name: "Broadband",
    amount: 40,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Mobile Phone",
    amount: 35,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Gym",
    amount: 40,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: false,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Netflix",
    amount: 18,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: false,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Spotify",
    amount: 11,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: false,
    isDefault: true,
  },
  {
    category: "expenses",
    name: "Car Insurance",
    amount: 60,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "savings",
    name: "Emergency Fund",
    amount: 200,
    frequency: "monthly",
    isIncome: false,
    isPrimaryIncome: false,
    isEssential: true,
    isDefault: true,
  },
  {
    category: "savings",
    name: "ISA / Investments",
    amount: 300,
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

@Controller()
@UseGuards(AuthGuard)
export class BudgetController {
  constructor(
    @InjectRepository(BudgetEntry)
    private readonly budgetEntryRepository: Repository<BudgetEntry>,
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  /**
   * Explicit opt-in only (POST budget-entries/seed-defaults). Idempotent: a
   * template the user already has (same name, isDefault true) is skipped.
   */
  private async seedDefaults(userId: string): Promise<BudgetEntry[]> {
    const existing = await this.budgetEntryRepository.find({ where: { userId } });
    const haveDefault = new Set(existing.filter((e) => e.isDefault).map((e) => e.name));
    const toCreate = DEFAULT_BUDGET_SEEDS.filter((seed) => !haveDefault.has(seed.name)).map(
      (seed) => this.budgetEntryRepository.create({ ...seed, userId }),
    );
    if (toCreate.length === 0) return [];
    return this.budgetEntryRepository.save(toCreate);
  }

  @Get("budget-entries")
  async getBudgetEntries(@Req() req: any): Promise<BudgetEntry[]> {
    const userId = req.user.id;
    const entries = await this.budgetEntryRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    return entries.map((entry) => ({
      ...entry,
      amount: Number(entry.amount) || 0,
    })) as BudgetEntry[];
  }

  @Post("budget-entries/seed-defaults")
  async seedDefaultBudgetEntries(@Req() req: any): Promise<BudgetEntry[]> {
    const userId = req.user.id;
    await this.seedDefaults(userId);
    const entries = await this.budgetEntryRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });
    return entries.map((entry) => ({
      ...entry,
      amount: Number(entry.amount) || 0,
    })) as BudgetEntry[];
  }

  @Post("budget-entries/categories")
  async addCustomCategory(
    @Req() req: any,
    @Body() body: { category: string },
  ): Promise<{ success: boolean; categories: string[] }> {
    const userId = req.user.id;
    const catName = body?.category?.trim();
    if (!catName) {
      throw new BadRequestException("Category name is required");
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
      currentCategories.push(normalized);
      profile.customBudgetCategories = currentCategories;
      await this.userProfileRepository.save(profile);
    }

    return { success: true, categories: profile.customBudgetCategories ?? [] };
  }

  @Post("budget-entries")
  async createBudgetEntry(
    @Req() req: any,
    @Body()
    body: {
      category: BudgetCategory;
      name?: string;
      /** Alias for `name`, accepted for older clients. */
      title?: string;
      amount: number;
      frequency?: BudgetFrequency;
      isIncome?: boolean;
      isEssential?: boolean;
      notes?: string | null;
    },
  ): Promise<BudgetEntry> {
    const userId = req.user.id;
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
    const saved = await this.budgetEntryRepository.save(entry);
    return {
      ...saved,
      amount: Number(saved.amount) || 0,
    } as BudgetEntry;
  }

  @Patch("budget-entries/:id")
  async updateBudgetEntry(
    @Req() req: any,
    @Param("id") id: string,
    @Body()
    body: {
      category?: BudgetCategory;
      name?: string;
      title?: string;
      amount?: number;
      frequency?: BudgetFrequency;
      isIncome?: boolean;
      isEssential?: boolean;
      notes?: string | null;
    },
  ): Promise<BudgetEntry> {
    const userId = req.user.id;
    const entry = await this.budgetEntryRepository.findOne({ where: { id, userId } });

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

    const saved = await this.budgetEntryRepository.save(entry);
    return {
      ...saved,
      amount: Number(saved.amount) || 0,
    } as BudgetEntry;
  }

  @Delete("budget-entries/:id")
  async deleteBudgetEntry(@Req() req: any, @Param("id") id: string): Promise<{ success: boolean }> {
    const userId = req.user.id;
    const entry = await this.budgetEntryRepository.findOne({ where: { id, userId } });

    if (!entry) {
      throw new NotFoundException("Budget entry not found");
    }

    await this.budgetEntryRepository.remove(entry);
    return { success: true };
  }
}
