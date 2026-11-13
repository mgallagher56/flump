import { calculateUKTax, type TaxRecord } from "@flump/finance-engine";

const base = {
  userId: "user-1",
  endDate: null,
  notes: null,
  receiptFilename: null,
  receiptMimeType: null,
  receiptData: null,
  createdAt: "2026-04-06T00:00:00Z",
  updatedAt: "2026-04-06T00:00:00Z",
} as const;

export const taxRecordsFixture: TaxRecord[] = [
  {
    ...base,
    id: "r1",
    name: "Flat rent",
    source: "rental",
    type: "income",
    category: "rental_income",
    amount: 1150,
    frequency: "monthly",
    date: "2026-04-06",
  },
  {
    ...base,
    id: "r2",
    name: "Mortgage interest",
    source: "rental",
    type: "expense",
    category: "mortgage_interest",
    amount: "545.00",
    frequency: "monthly",
    date: "2026-04-06",
  },
  {
    ...base,
    id: "r3",
    name: "Design retainer",
    source: "self-employed",
    type: "income",
    category: "self_employed_income",
    amount: 1800,
    frequency: "monthly",
    date: "2026-04-30",
  },
  {
    ...base,
    id: "r4",
    name: "Laptop",
    source: "self-employed",
    type: "expense",
    category: "office_costs",
    amount: 1299,
    frequency: "one-off",
    date: "2026-06-02",
    hasReceipt: true,
    receiptFilename: "laptop.pdf",
    receiptMimeType: "application/pdf",
  },
  {
    ...base,
    id: "r5",
    name: "Saver interest",
    source: "savings",
    type: "income",
    category: "savings_interest",
    amount: 48,
    frequency: "monthly",
    date: "2026-04-30",
  },
  {
    ...base,
    id: "r6",
    name: "Old rent",
    source: "rental",
    type: "income",
    category: "rental_income",
    amount: 1100,
    frequency: "monthly",
    date: "2025-04-06",
    endDate: "2026-04-05",
  },
];

/** `count` one-off records in 2026/27, to exercise pagination. */
export const manyRecords = (count: number): TaxRecord[] =>
  Array.from({ length: count }, (_, i) => ({
    ...base,
    id: `m${i + 1}`,
    name: `Receipt ${String(i + 1).padStart(2, "0")}`,
    source: "self-employed" as const,
    type: "expense" as const,
    category: "office_costs",
    amount: 10 + i,
    frequency: "one-off" as const,
    date: `2026-05-${String((i % 28) + 1).padStart(2, "0")}`,
  }));

export const taxResultFixture = calculateUKTax("2026/27", taxRecordsFixture, 52000, 50);
