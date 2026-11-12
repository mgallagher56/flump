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
import { UserProfile } from "./entities/user-profile.entity";
import { RateLimit } from "./security/rate-limit.decorator";

/**
 * Allow-list of client-writable tax record fields. `id`, `userId`,
 * `createdAt` and `updatedAt` are never copied from a request body.
 */
const TAX_RECORD_FIELDS = [
  "type",
  "source",
  "category",
  "name",
  "amount",
  "frequency",
  "date",
  "endDate",
  "notes",
  "receiptFilename",
  "receiptMimeType",
  "receiptData",
] as const;

const pickTaxRecordFields = (body: Partial<TaxRecord> | undefined): Partial<TaxRecord> => {
  const picked: Record<string, unknown> = {};
  for (const key of TAX_RECORD_FIELDS) {
    if (body?.[key] !== undefined) picked[key] = body[key];
  }
  return picked as Partial<TaxRecord>;
};

@Controller("tax-records")
@UseGuards(AuthGuard)
export class TaxController {
  constructor(
    @InjectRepository(TaxRecord)
    private readonly taxRecordRepository: Repository<TaxRecord>,
    @InjectRepository(UserProfile)
    private readonly _userProfileRepository: Repository<UserProfile>,
  ) {}

  @Get()
  async getTaxRecords(@Req() req: any): Promise<TaxRecord[]> {
    const userId = req.user.id;
    return this.taxRecordRepository.find({
      where: { userId },
      order: { date: "DESC" },
    });
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

  @Post("bulk")
  @RateLimit("bank")
  async createBulkTaxRecords(
    @Req() req: any,
    @Body()
    body: {
      records: Partial<TaxRecord>[];
      capPreviousRecordIds?: { id: string; endDate: string }[];
    },
  ): Promise<TaxRecord[]> {
    const userId = req.user.id;

    if (body.capPreviousRecordIds && Array.isArray(body.capPreviousRecordIds)) {
      for (const item of body.capPreviousRecordIds) {
        if (item.id && item.endDate) {
          await this.taxRecordRepository.update({ id: item.id, userId }, { endDate: item.endDate });
        }
      }
    }

    if (!body.records || !Array.isArray(body.records) || body.records.length === 0) {
      return [];
    }

    const created = this.taxRecordRepository.create(
      body.records.map((r) => ({
        ...pickTaxRecordFields(r),
        userId,
      })),
    );
    return this.taxRecordRepository.save(created);
  }

  @Post()
  async createTaxRecord(@Req() req: any, @Body() body: any): Promise<TaxRecord> {
    const userId = req.user.id;
    const record = this.taxRecordRepository.create({
      ...pickTaxRecordFields(body),
      userId,
    });
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
    Object.assign(record, pickTaxRecordFields(body));
    return this.taxRecordRepository.save(record);
  }

  @Delete(":id")
  @RateLimit("destructive")
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
