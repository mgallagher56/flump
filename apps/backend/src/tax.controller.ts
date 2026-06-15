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
import { TaxRecord } from "./entities/tax-record.entity";

@Controller("tax-records")
@UseGuards(AuthGuard)
export class TaxController {
  constructor(
    @InjectRepository(TaxRecord)
    private readonly taxRecordRepository: Repository<TaxRecord>,
  ) {}

  @Get()
  async getTaxRecords(@Req() req: any): Promise<TaxRecord[]> {
    const userId = req.user.id;
    let records = await this.taxRecordRepository.find({
      where: { userId },
      order: { date: "DESC" },
    });

    if (records.length === 0) {
      // Seed historical Poplar P&L data for rental property, plus some mock self-employed data
      const defaultRecords: Partial<TaxRecord>[] = [
        // --- 2020/21 Fiscal Year Seeding ---
        {
          userId,
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "Poplar Rent (2020/21)",
          amount: 1250.0,
          frequency: "monthly",
          date: "2020-12-01",
          endDate: "2021-03-31",
          notes: "Initial tenancy rent",
        },
        {
          userId,
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "Poplar Rent Partial Nov 2020",
          amount: 540.0,
          frequency: "one-off",
          date: "2020-11-05",
          notes: "First partial month rent",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Curo Service Charge & Ground Rent (2020/21)",
          amount: 46.22,
          frequency: "monthly",
          date: "2020-11-01",
          endDate: "2021-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Internet (2020/21)",
          amount: 25.0,
          frequency: "monthly",
          date: "2020-11-01",
          endDate: "2021-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Energy Bills (2020/21)",
          amount: 56.0,
          frequency: "monthly",
          date: "2020-11-01",
          endDate: "2021-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Council Tax (2020/21)",
          amount: 108.0,
          frequency: "monthly",
          date: "2020-11-01",
          endDate: "2021-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Water Bill (2020/21)",
          amount: 30.0,
          frequency: "monthly",
          date: "2020-11-01",
          endDate: "2021-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Insurance",
          amount: 10.18,
          frequency: "one-off",
          date: "2020-11-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "legal_management_fees",
          name: "OpenRent Tenancy Fees",
          amount: 64.0,
          frequency: "one-off",
          date: "2020-11-01",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "legal_management_fees",
          name: "Spareroom Ad",
          amount: 22.0,
          frequency: "one-off",
          date: "2020-11-01",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "mortgage_interest",
          name: "Mortgage Interest (2020/21)",
          amount: 340.0,
          frequency: "monthly",
          date: "2020-11-01",
          endDate: "2021-03-31",
        },

        // --- 2021/22 Fiscal Year Seeding ---
        {
          userId,
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "Poplar Rent (2021/22)",
          amount: 1250.0,
          frequency: "monthly",
          date: "2021-04-01",
          endDate: "2022-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Curo Service Charge & Ground Rent (2021/22)",
          amount: 43.42,
          frequency: "monthly",
          date: "2021-04-01",
          endDate: "2022-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Internet (2021/22)",
          amount: 25.0,
          frequency: "monthly",
          date: "2021-04-01",
          endDate: "2022-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Energy Bills (2021/22)",
          amount: 96.0,
          frequency: "monthly",
          date: "2021-04-01",
          endDate: "2022-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Council Tax (2021/22)",
          amount: 108.0,
          frequency: "monthly",
          date: "2021-04-01",
          endDate: "2022-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Water Bill (2021/22)",
          amount: 40.5,
          frequency: "monthly",
          date: "2021-04-01",
          endDate: "2022-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Insurance Renewal 21/22",
          amount: 122.21,
          frequency: "one-off",
          date: "2021-04-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "repairs_maintenance",
          name: "Boiler Safety Certificate",
          amount: 115.0,
          frequency: "one-off",
          date: "2021-12-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "replace_domestic_items",
          name: "Carpet & Flooring",
          amount: 640.0,
          frequency: "one-off",
          date: "2021-04-10",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "replace_domestic_items",
          name: "Kitchen Units Installation",
          amount: 1762.0,
          frequency: "one-off",
          date: "2021-04-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "replace_domestic_items",
          name: "Smoke & Carbon Monoxide Alarms",
          amount: 51.0,
          frequency: "one-off",
          date: "2021-04-12",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "mortgage_interest",
          name: "Mortgage Interest (2021/22)",
          amount: 330.0,
          frequency: "monthly",
          date: "2021-04-01",
          endDate: "2022-03-31",
        },

        // --- 2022/23 Fiscal Year Seeding ---
        {
          userId,
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "Poplar Rent Early 22/23",
          amount: 1250.0,
          frequency: "monthly",
          date: "2022-04-01",
          endDate: "2022-05-31",
        },
        {
          userId,
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "Poplar Rent Mid 22/23",
          amount: 1123.0,
          frequency: "monthly",
          date: "2022-07-01",
          endDate: "2022-09-30",
        },
        {
          userId,
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "Poplar Rent Late 22/23",
          amount: 1070.0,
          frequency: "monthly",
          date: "2022-10-01",
          endDate: "2023-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Curo Service Charge & Ground Rent (2022/23)",
          amount: 44.26,
          frequency: "monthly",
          date: "2022-04-01",
          endDate: "2023-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Internet (2022/23)",
          amount: 23.0,
          frequency: "monthly",
          date: "2022-04-01",
          endDate: "2023-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Insurance Renewal 22/23",
          amount: 118.04,
          frequency: "one-off",
          date: "2022-04-18",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "legal_management_fees",
          name: "OpenRent Fees 2022",
          amount: 129.0,
          frequency: "one-off",
          date: "2022-05-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "repairs_maintenance",
          name: "Boiler Safety Certificate & EPC",
          amount: 115.0,
          frequency: "one-off",
          date: "2022-12-10",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "repairs_maintenance",
          name: "Electrics Certificate",
          amount: 169.0,
          frequency: "one-off",
          date: "2022-06-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "repairs_maintenance",
          name: "General Repairs",
          amount: 300.0,
          frequency: "one-off",
          date: "2022-09-05",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "replace_domestic_items",
          name: "Fridge & Microwave Replacement",
          amount: 466.92,
          frequency: "one-off",
          date: "2023-03-10",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "mortgage_interest",
          name: "Mortgage Interest (2022/23)",
          amount: 314.91,
          frequency: "monthly",
          date: "2022-04-01",
          endDate: "2023-03-31",
        },

        // --- 2023/24 Fiscal Year Seeding ---
        {
          userId,
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "Poplar Rent (2023/24)",
          amount: 1070.0,
          frequency: "monthly",
          date: "2023-04-01",
          endDate: "2024-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Curo Service Charge & Ground Rent (2023/24)",
          amount: 46.69,
          frequency: "monthly",
          date: "2023-04-01",
          endDate: "2024-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Internet (2023/24)",
          amount: 30.19,
          frequency: "monthly",
          date: "2023-04-01",
          endDate: "2024-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Insurance Renewal 23/24",
          amount: 156.14,
          frequency: "one-off",
          date: "2023-04-20",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "legal_management_fees",
          name: "Remortgage Solicitor Fees",
          amount: 1544.0,
          frequency: "one-off",
          date: "2023-03-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "legal_management_fees",
          name: "Mortgage Broker Fees",
          amount: 495.0,
          frequency: "one-off",
          date: "2023-03-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "repairs_maintenance",
          name: "Boiler Service & Gas Safety Check",
          amount: 184.0,
          frequency: "one-off",
          date: "2023-12-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "mortgage_interest",
          name: "Mortgage Interest (2023/24)",
          amount: 559.78,
          frequency: "monthly",
          date: "2023-04-01",
          endDate: "2024-03-31",
        },

        // --- 2024/25 Fiscal Year Seeding ---
        {
          userId,
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "Poplar Rent (2024/25)",
          amount: 1150.0,
          frequency: "monthly",
          date: "2024-04-01",
          endDate: "2025-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Curo Service Charge & Ground Rent (2024/25)",
          amount: 45.57,
          frequency: "monthly",
          date: "2024-04-01",
          endDate: "2025-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Internet (2024/25)",
          amount: 32.45,
          frequency: "monthly",
          date: "2024-04-01",
          endDate: "2025-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Insurance Renewal 24/25",
          amount: 161.55,
          frequency: "one-off",
          date: "2024-04-22",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "services_costs",
          name: "Gardening & Groundskeeping",
          amount: 150.0,
          frequency: "one-off",
          date: "2024-07-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "repairs_maintenance",
          name: "Boiler Service",
          amount: 135.0,
          frequency: "one-off",
          date: "2024-12-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "repairs_maintenance",
          name: "Tools & Parts for Repair",
          amount: 212.71,
          frequency: "one-off",
          date: "2024-09-15",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "mortgage_interest",
          name: "Mortgage Interest (2024/25)",
          amount: 545.0,
          frequency: "monthly",
          date: "2024-04-01",
          endDate: "2025-03-31",
        },

        // --- 2025/26 Fiscal Year Seeding ---
        {
          userId,
          type: "income",
          source: "rental",
          category: "rental_income",
          name: "Poplar Rent (2025/26)",
          amount: 1150.0,
          frequency: "monthly",
          date: "2025-04-01",
          endDate: "2026-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Curo Service Charge & Ground Rent (2025/26)",
          amount: 111.86,
          frequency: "monthly",
          date: "2025-04-01",
          endDate: "2026-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "rent_rates_insurance",
          name: "Internet (2025/26)",
          amount: 34.93,
          frequency: "monthly",
          date: "2025-04-01",
          endDate: "2026-03-31",
        },
        {
          userId,
          type: "expense",
          source: "rental",
          category: "mortgage_interest",
          name: "Mortgage Interest (2025/26)",
          amount: 520.38,
          frequency: "monthly",
          date: "2025-04-01",
          endDate: "2026-03-31",
        },

        // --- Self Employed Seeding ---
        {
          userId,
          type: "income",
          source: "self-employed",
          category: "self_employed_income",
          name: "Freelance Software Consulting",
          amount: 3500.0,
          frequency: "monthly",
          date: "2024-06-01",
          notes: "Monthly retainer for design work",
        },
        {
          userId,
          type: "expense",
          source: "self-employed",
          category: "office_costs",
          name: "GitHub & Software Subscriptions",
          amount: 49.0,
          frequency: "monthly",
          date: "2024-06-01",
        },
        {
          userId,
          type: "expense",
          source: "self-employed",
          category: "office_costs",
          name: "MacBook Pro Purchase",
          amount: 1200.0,
          frequency: "one-off",
          date: "2024-06-15",
          notes: "Primary development machine",
        },
        {
          userId,
          type: "expense",
          source: "self-employed",
          category: "premises_costs",
          name: "Co-Working Desk",
          amount: 250.0,
          frequency: "monthly",
          date: "2024-07-01",
        },
      ];

      const created = this.taxRecordRepository.create(
        defaultRecords.map((r) => ({ ...r, userId })),
      );
      await this.taxRecordRepository.save(created);

      records = await this.taxRecordRepository.find({
        where: { userId },
        order: { date: "DESC" },
      });
    }

    return records;
  }

  @Get(":id")
  async getTaxRecord(@Req() req: any, @Param("id") id: string): Promise<TaxRecord> {
    const userId = req.user.id;
    const record = await this.taxRecordRepository.findOne({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException("Tax record not found");
    }
    return record;
  }

  @Post()
  async createTaxRecord(@Req() req: any, @Body() body: any): Promise<TaxRecord> {
    const userId = req.user.id;
    const record = this.taxRecordRepository.create({
      ...body,
      userId,
    } as Partial<TaxRecord>);
    return this.taxRecordRepository.save(record);
  }

  @Patch(":id")
  async updateTaxRecord(
    @Req() req: any,
    @Param("id") id: string,
    @Body() body: any,
  ): Promise<TaxRecord> {
    const userId = req.user.id;
    const record = await this.taxRecordRepository.findOne({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException("Tax record not found");
    }
    Object.assign(record, body);
    return this.taxRecordRepository.save(record);
  }

  @Delete(":id")
  async deleteTaxRecord(@Req() req: any, @Param("id") id: string): Promise<{ success: boolean }> {
    const userId = req.user.id;
    const record = await this.taxRecordRepository.findOne({ where: { id, userId } });
    if (!record) {
      throw new NotFoundException("Tax record not found");
    }
    await this.taxRecordRepository.remove(record);
    return { success: true };
  }
}
