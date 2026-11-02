import { Body, Controller, Get, Patch, Req, UseGuards } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuthGuard } from "./auth/auth.guard";
import { UserProfile } from "./entities/user-profile.entity";

@Controller()
@UseGuards(AuthGuard)
export class UserProfileController {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userProfileRepository: Repository<UserProfile>,
  ) {}

  private formatProfile(profile: UserProfile): any {
    return {
      ...profile,
      annualSalary:
        profile.annualSalary !== null && profile.annualSalary !== undefined
          ? Number(profile.annualSalary)
          : null,
      monthlyTakeHome:
        profile.monthlyTakeHome !== null && profile.monthlyTakeHome !== undefined
          ? Number(profile.monthlyTakeHome)
          : null,
      secondIncomeMonthly:
        profile.secondIncomeMonthly !== null && profile.secondIncomeMonthly !== undefined
          ? Number(profile.secondIncomeMonthly)
          : null,
      rentalIncomeMonthly:
        profile.rentalIncomeMonthly !== null && profile.rentalIncomeMonthly !== undefined
          ? Number(profile.rentalIncomeMonthly)
          : null,
      propertyOwnershipShare:
        profile.propertyOwnershipShare !== null && profile.propertyOwnershipShare !== undefined
          ? Number(profile.propertyOwnershipShare)
          : 100.0,
      pensionPercent:
        profile.pensionPercent !== null && profile.pensionPercent !== undefined
          ? Number(profile.pensionPercent)
          : 5.0,
      pensionEmployerPercent:
        profile.pensionEmployerPercent !== null && profile.pensionEmployerPercent !== undefined
          ? Number(profile.pensionEmployerPercent)
          : 3.0,
      monthlySavingsTarget:
        profile.monthlySavingsTarget !== null && profile.monthlySavingsTarget !== undefined
          ? Number(profile.monthlySavingsTarget)
          : null,
      savingsDefaultInterestRate:
        profile.savingsDefaultInterestRate !== null &&
        profile.savingsDefaultInterestRate !== undefined
          ? Number(profile.savingsDefaultInterestRate)
          : 5.0,
    };
  }

  @Get("user-profile")
  async getUserProfile(@Req() req: any): Promise<any> {
    const userId = req.user.id;
    let profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = await this.userProfileRepository.save(
        this.userProfileRepository.create({
          userId,
          displayName: null,
          avatarUrl: null,
          currency: "GBP",
          country: "GB",
          employmentType: null,
          annualSalary: null,
          monthlyTakeHome: null,
          hasSecondIncome: false,
          secondIncomeMonthly: null,
          hasRentalIncome: false,
          rentalIncomeMonthly: null,
          hasMortgage: false,
          propertyOwnershipShare: 100.0,
          pensionPercent: 5.0,
          pensionEmployerPercent: 3.0,
          isSalarySacrifice: true,
          monthlySavingsTarget: null,
          savingsAllocationMode: "per_account",
          savingsDefaultInterestRate: 5.0,
          setupChecklistCompletedSteps: [],
        }),
      );
    }

    return this.formatProfile(profile);
  }

  @Patch("user-profile")
  async updateUserProfile(
    @Req() req: any,
    @Body()
    body: {
      displayName?: string | null;
      avatarUrl?: string | null;
      currency?: string;
      country?: string;
      employmentType?: "employed" | "self-employed" | "other" | null;
      annualSalary?: number | null;
      monthlyTakeHome?: number | null;
      hasSecondIncome?: boolean;
      secondIncomeMonthly?: number | null;
      hasRentalIncome?: boolean;
      rentalIncomeMonthly?: number | null;
      hasMortgage?: boolean;
      propertyOwnershipShare?: number;
      pensionPercent?: number;
      pensionEmployerPercent?: number;
      isSalarySacrifice?: boolean;
      monthlySavingsTarget?: number | null;
      savingsAllocationMode?: "total" | "per_account";
      savingsDefaultInterestRate?: number;
    },
  ): Promise<any> {
    const userId = req.user.id;
    let profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = this.userProfileRepository.create({
        userId,
        displayName: null,
        avatarUrl: null,
        currency: "GBP",
        country: "GB",
        employmentType: null,
        annualSalary: null,
        monthlyTakeHome: null,
        hasSecondIncome: false,
        secondIncomeMonthly: null,
        hasRentalIncome: false,
        rentalIncomeMonthly: null,
        hasMortgage: false,
        propertyOwnershipShare: 100.0,
        pensionPercent: 5.0,
        pensionEmployerPercent: 3.0,
        isSalarySacrifice: true,
        monthlySavingsTarget: null,
        savingsAllocationMode: "per_account",
        savingsDefaultInterestRate: 5.0,
        setupChecklistCompletedSteps: [],
      });
    }

    if (body.displayName !== undefined) profile.displayName = body.displayName ?? null;
    if (body.avatarUrl !== undefined) profile.avatarUrl = body.avatarUrl ?? null;
    if (body.currency !== undefined) profile.currency = body.currency;
    if (body.country !== undefined) profile.country = body.country;
    if (body.employmentType !== undefined) profile.employmentType = body.employmentType ?? null;
    if (body.annualSalary !== undefined) profile.annualSalary = body.annualSalary ?? null;
    if (body.monthlyTakeHome !== undefined) profile.monthlyTakeHome = body.monthlyTakeHome ?? null;
    if (body.hasSecondIncome !== undefined) profile.hasSecondIncome = body.hasSecondIncome;
    if (body.secondIncomeMonthly !== undefined)
      profile.secondIncomeMonthly = body.secondIncomeMonthly ?? null;
    if (body.hasRentalIncome !== undefined) profile.hasRentalIncome = body.hasRentalIncome;
    if (body.rentalIncomeMonthly !== undefined)
      profile.rentalIncomeMonthly = body.rentalIncomeMonthly ?? null;
    if (body.hasMortgage !== undefined) profile.hasMortgage = body.hasMortgage;
    if (body.propertyOwnershipShare !== undefined)
      profile.propertyOwnershipShare = body.propertyOwnershipShare;
    if (body.pensionPercent !== undefined) profile.pensionPercent = body.pensionPercent;
    if (body.pensionEmployerPercent !== undefined)
      profile.pensionEmployerPercent = body.pensionEmployerPercent;
    if (body.isSalarySacrifice !== undefined) profile.isSalarySacrifice = body.isSalarySacrifice;
    if (body.monthlySavingsTarget !== undefined)
      profile.monthlySavingsTarget = body.monthlySavingsTarget ?? null;
    if (body.savingsAllocationMode !== undefined)
      profile.savingsAllocationMode = body.savingsAllocationMode;
    if (body.savingsDefaultInterestRate !== undefined)
      profile.savingsDefaultInterestRate = body.savingsDefaultInterestRate;

    const saved = await this.userProfileRepository.save(profile);
    return this.formatProfile(saved);
  }

  @Patch("user-profile/checklist")
  async updateChecklist(
    @Req() req: any,
    @Body() body: { step: string; completed: boolean },
  ): Promise<any> {
    const userId = req.user.id;
    let profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = this.userProfileRepository.create({
        userId,
        displayName: null,
        currency: "GBP",
        country: "GB",
        employmentType: null,
        annualSalary: null,
        monthlyTakeHome: null,
        hasSecondIncome: false,
        secondIncomeMonthly: null,
        hasRentalIncome: false,
        rentalIncomeMonthly: null,
        hasMortgage: false,
        propertyOwnershipShare: 100.0,
        pensionPercent: 5.0,
        pensionEmployerPercent: 3.0,
        isSalarySacrifice: true,
        monthlySavingsTarget: null,
        savingsAllocationMode: "per_account",
        savingsDefaultInterestRate: 5.0,
        setupChecklistCompletedSteps: [],
      });
    }

    const steps = Array.isArray(profile.setupChecklistCompletedSteps)
      ? [...profile.setupChecklistCompletedSteps]
      : [];

    if (body.completed) {
      if (!steps.includes(body.step)) {
        steps.push(body.step);
      }
    } else {
      const idx = steps.indexOf(body.step);
      if (idx !== -1) {
        steps.splice(idx, 1);
      }
    }

    profile.setupChecklistCompletedSteps = steps;
    const saved = await this.userProfileRepository.save(profile);
    return this.formatProfile(saved);
  }
}
