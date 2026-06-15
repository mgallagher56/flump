import {
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

type BudgetCategory = "housing" | "bills" | "expenses" | "savings" | "income";
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
  {
    category: "income",
    name: "Salary (Take Home)",
    amount: 3000,
    frequency: "monthly",
    isIncome: true,
    isPrimaryIncome: true,
    isEssential: true,
    isDefault: true,
  },
];

@Controller()
@UseGuards(AuthGuard)
export class BudgetController {
  constructor(
    @InjectRepository(BudgetEntry)
    private readonly budgetEntryRepository: Repository<BudgetEntry>,
  ) {}

  private async seedDefaults(userId: string): Promise<BudgetEntry[]> {
    const entries = DEFAULT_BUDGET_SEEDS.map((seed) =>
      this.budgetEntryRepository.create({ ...seed, userId }),
    );
    return this.budgetEntryRepository.save(entries);
  }

  @Get("budget-entries")
  async getBudgetEntries(@Req() req: any): Promise<BudgetEntry[]> {
    const userId = req.user.id;
    let entries = await this.budgetEntryRepository.find({
      where: { userId },
      order: { createdAt: "ASC" },
    });

    if (entries.length === 0) {
      entries = await this.seedDefaults(userId);
    }

    return entries;
  }

  @Post("budget-entries")
  async createBudgetEntry(
    @Req() req: any,
    @Body()
    body: {
      category: BudgetCategory;
      name: string;
      amount: number;
      frequency?: BudgetFrequency;
      isIncome?: boolean;
      isEssential?: boolean;
      notes?: string | null;
    },
  ): Promise<BudgetEntry> {
    const userId = req.user.id;
    const entry = this.budgetEntryRepository.create({
      userId,
      category: body.category,
      name: body.name,
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

  @Patch("budget-entries/:id")
  async updateBudgetEntry(
    @Req() req: any,
    @Param("id") id: string,
    @Body()
    body: {
      category?: BudgetCategory;
      name?: string;
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
    if (body.name !== undefined) entry.name = body.name;
    if (body.amount !== undefined) entry.amount = body.amount;
    if (body.frequency !== undefined) entry.frequency = body.frequency;
    if (body.isIncome !== undefined) entry.isIncome = body.isIncome;
    if (body.isEssential !== undefined) entry.isEssential = body.isEssential;
    if (body.notes !== undefined) entry.notes = body.notes ?? null;

    return this.budgetEntryRepository.save(entry);
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

  @Post("budget-entries/reset")
  async resetBudgetEntries(@Req() req: any): Promise<BudgetEntry[]> {
    const userId = req.user.id;
    const existing = await this.budgetEntryRepository.find({ where: { userId } });
    if (existing.length > 0) {
      await this.budgetEntryRepository.remove(existing);
    }
    return this.seedDefaults(userId);
  }
}
