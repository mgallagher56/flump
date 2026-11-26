import { describe, expect, test } from "bun:test";
import {
  ALLOWED_FILES,
  findHouseholdMembersViolations,
  isAllowedFile,
  isCoveredFile,
  scanHouseholdMembers,
} from "./check-household-members";

const OTHER = "apps/backend/src/modules/finance/finance.service.ts";
const lines = (file: string, source: string) =>
  findHouseholdMembersViolations(file, source).map((v) => v.line);

describe("household membership law (E34 C3)", () => {
  test("the live backend names household_members only where allowed", () => {
    expect(scanHouseholdMembers()).toEqual([]);
  });

  test("flags the table in a query, the entity and its import outside the allowed files", () => {
    const source = [
      'import { HouseholdMember } from "../../entities/household-member.entity";',
      "const rows = await m.query(`SELECT user_id FROM household_members`);",
      "const repo = m.getRepository(HouseholdMember);",
      "const fine = 1;",
    ].join("\n");
    expect(lines(OTHER, source)).toEqual([1, 2, 3]);
  });

  test("ignores a mention in a comment, line or block", () => {
    const source = [
      "// household_members is not read here",
      "/* HouseholdMember",
      "   household_members */ const x = 1;",
      "const y = 2; // HouseholdMember",
    ].join("\n");
    expect(lines(OTHER, source)).toEqual([]);
  });

  test("does not match a longer name", () => {
    expect(lines(OTHER, "const household_members_count = 1; const HouseholdMembers = 2;")).toEqual(
      [],
    );
  });

  test("allows the household module, migrations and the listed privacy files only", () => {
    const query = "await m.query(`SELECT 1 FROM household_members`);";
    expect(lines("apps/backend/src/modules/household/household.service.ts", query)).toEqual([]);
    expect(lines("apps/backend/src/migrations/AddHouseholds1795660000000.ts", query)).toEqual([]);
    expect(lines("apps/backend/src/modules/privacy/household-leave.ts", query)).toEqual([]);
    expect(lines("apps/backend/src/modules/privacy/user-data-write-fence.ts", query)).toEqual([1]);
    expect(lines("apps/backend/src/modules/agent/mcp.service.ts", query)).toEqual([1]);
    expect(isAllowedFile("apps/backend/src/modules/householdx/a.ts")).toBe(false);
  });

  test("covers production source only", () => {
    expect(isCoveredFile("apps/backend/src/modules/finance/finance.service.ts")).toBe(true);
    expect(isCoveredFile("apps/backend/src/modules/finance/finance.service.spec.ts")).toBe(false);
    expect(isCoveredFile("apps/backend/src/testing/emptyTables.ts")).toBe(false);
    expect(isCoveredFile("apps/backend/src/x.d.ts")).toBe(false);
  });

  test("every allowed file names its reason", () => {
    for (const reason of Object.values(ALLOWED_FILES)) expect(reason.length).toBeGreaterThan(10);
  });
});
