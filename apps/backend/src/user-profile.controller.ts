import { Body, Controller, Get, NotFoundException, Patch, Req, UseGuards } from "@nestjs/common";
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

  @Get("user-profile")
  async getUserProfile(@Req() req: any): Promise<UserProfile> {
    const userId = req.user.id;
    let profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      profile = await this.userProfileRepository.save(
        this.userProfileRepository.create({
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
          isSalarySacrifice: true,
          setupChecklistCompletedSteps: [],
        }),
      );
    }

    return profile;
  }

  @Patch("user-profile")
  async updateUserProfile(
    @Req() req: any,
    @Body()
    body: {
      displayName?: string | null;
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
      isSalarySacrifice?: boolean;
    },
  ): Promise<UserProfile> {
    const userId = req.user.id;
    const profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException("User profile not found");
    }

    if (body.displayName !== undefined) profile.displayName = body.displayName ?? null;
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
    if (body.isSalarySacrifice !== undefined) profile.isSalarySacrifice = body.isSalarySacrifice;

    return this.userProfileRepository.save(profile);
  }

  @Patch("user-profile/checklist")
  async updateChecklist(
    @Req() req: any,
    @Body() body: { step: string; completed: boolean },
  ): Promise<UserProfile> {
    const userId = req.user.id;
    const profile = await this.userProfileRepository.findOne({ where: { userId } });

    if (!profile) {
      throw new NotFoundException("User profile not found");
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
    return this.userProfileRepository.save(profile);
  }
}
