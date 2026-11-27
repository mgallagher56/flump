/**
 * The account writes the app makes (E12 S8), applied to the stand-in's store the way the backend
 * applies them: `POST /accounts`, `POST /accounts/mortgage-with-property`, `PATCH /accounts/:id`
 * (with `If-Match` checked against the account's version) and `DELETE /accounts/:id` (its months
 * go too). A liability is stored as minus the amount owed, and a balance written now also writes
 * this month's history row, as the backend's stored-balance rule does.
 */
import { randomUUID } from "node:crypto";
import {
  type AccountDto,
  type AccountWithDetailsDto,
  type CreateAccountRequest,
  type CreateMortgageWithPropertyRequest,
  etagFor,
  type UpdateAccountRequest,
} from "@flump/api-contract";
import { type CheckInStore, isLiabilityType, londonMonth } from "./fixtures";

export type AccountWriteError =
  | { status: 404; code: "not_found"; message: string }
  | { status: 412; code: "precondition_failed"; message: string };

const stored = (type: string, balance: number) =>
  isLiabilityType(type) ? -Math.abs(balance) : balance;

/** The answer: the account without its months. */
function dto(account: AccountWithDetailsDto): AccountDto {
  const { details: _months, ...rest } = account;
  return rest;
}

/** This month's history row for a balance written now: one per account and month. */
function writeMonth(
  store: CheckInStore,
  userId: string,
  account: AccountWithDetailsDto,
  now: Date,
) {
  const month = londonMonth(now);
  const [year, m] = month.split("-").map(Number) as [number, number];
  const iso = now.toISOString();
  const existing = store.details.find(
    (d) => d.accountId === account.id && d.year === year && d.month === m,
  );
  const row = {
    value: account.balance,
    asOfDate: iso.slice(0, 10),
    source: "manual" as const,
    updatedAt: iso,
  };
  if (existing) Object.assign(existing, row);
  else {
    store.details.push({
      id: store.nextDetailId++,
      accountId: account.id,
      userId,
      year,
      month: m,
      importBatchId: null,
      ...row,
    });
  }
}

function newAccount(body: CreateAccountRequest, iso: string): AccountWithDetailsDto {
  const ownership = body.ownership ?? "sole";
  return {
    id: randomUUID(),
    name: body.name,
    type: body.type,
    accountSubtype: body.accountSubtype ?? null,
    balance: stored(body.type, body.balance),
    interestRate: body.interestRate ?? null,
    monthlyContribution: body.monthlyContribution ?? null,
    creditLimit: body.creditLimit ?? null,
    promoZeroPercentUntil: body.promoZeroPercentUntil ?? null,
    termMonths: body.termMonths ?? null,
    fixedRateEndDate: body.fixedRateEndDate ?? null,
    isCurrent: true,
    currency: body.currency ?? "GBP",
    studentLoanPlan: body.studentLoanPlan ?? null,
    ownership,
    sharePercent: ownership === "joint" ? (body.sharePercent ?? 50) : null,
    linkedAccountId: body.linkedAccountId ?? null,
    repaymentType: body.repaymentType ?? null,
    connectionId: null,
    createdAt: iso,
    updatedAt: iso,
    details: [],
  };
}

export function createAccount(
  store: CheckInStore,
  userId: string,
  body: CreateAccountRequest,
  now: Date,
): AccountDto {
  const account = newAccount(body, now.toISOString());
  store.accounts.push(account);
  writeMonth(store, userId, account, now);
  return dto(account);
}

/** Both added and linked, the property at the mortgage's ownership and share, of its kind. */
export function createMortgageWithProperty(
  store: CheckInStore,
  userId: string,
  body: CreateMortgageWithPropertyRequest,
  now: Date,
): { mortgage: AccountDto; property: AccountDto } {
  const ownership = body.property.ownership ?? body.mortgage.ownership ?? "sole";
  const property = createAccount(
    store,
    userId,
    {
      name: body.property.name ?? "Home (your estimate)",
      type: "Property",
      accountSubtype: body.mortgage.accountSubtype === "btl_mortgage" ? "rental" : "home",
      balance: body.property.balance,
      ownership,
      sharePercent: body.property.sharePercent ?? body.mortgage.sharePercent ?? null,
    },
    now,
  );
  const mortgage = createAccount(
    store,
    userId,
    { ...body.mortgage, type: "Mortgage", linkedAccountId: property.id },
    now,
  );
  return { mortgage, property };
}

export function updateAccount(
  store: CheckInStore,
  userId: string,
  id: string,
  body: UpdateAccountRequest,
  ifMatch: string | undefined,
  now: Date,
): AccountDto | AccountWriteError {
  const account = store.accounts.find((a) => a.id === id.toLowerCase());
  if (!account) return { status: 404, code: "not_found", message: "Account not found" };
  if (ifMatch !== undefined && ifMatch !== etagFor(account.updatedAt)) {
    return {
      status: 412,
      code: "precondition_failed",
      message: "The account changed since it was read.",
    };
  }
  const { balance, ...rest } = body;
  const wasOwed = isLiabilityType(account.type);
  Object.assign(account, rest, { updatedAt: now.toISOString() });
  if (body.ownership === "sole") account.sharePercent = null;
  // A type change re-signs the stored balance: a debt that becomes something owned turns
  // positive (the "rises by twice its balance" note), and anything that becomes a debt negative.
  if (balance !== undefined) account.balance = stored(account.type, balance);
  else if (body.type !== undefined) {
    account.balance =
      wasOwed && !isLiabilityType(account.type)
        ? Math.abs(account.balance)
        : stored(account.type, account.balance);
  }
  if (balance !== undefined) writeMonth(store, userId, account, now);
  return dto(account);
}

export function deleteAccount(store: CheckInStore, id: string): boolean {
  const index = store.accounts.findIndex((a) => a.id === id.toLowerCase());
  if (index < 0) return false;
  const [gone] = store.accounts.splice(index, 1);
  store.details = store.details.filter((d) => d.accountId !== gone?.id);
  return true;
}
