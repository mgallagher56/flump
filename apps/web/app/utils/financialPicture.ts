import {
  buildFinancialPicture,
  type Figure,
  type FinancialPicture,
  financialPictureInputFromRows,
  isFigureKnown,
  type PortfolioSnapshot,
} from "@flump/finance-engine";

/** The rows a web loader already holds from loadWorkspaceSnapshot. */
export interface WorkspaceRows {
  userProfile?: unknown;
  accounts?: unknown;
  accountDetails?: unknown;
  budgetEntries?: unknown;
  taxRecords?: unknown;
}

const asArray = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/**
 * The one way a web loader gets derived figures (E23 section 2): net worth, debt, budget totals,
 * safe to spend and months of cover all come from the engine's financial picture. Pages never
 * recompute them from rows.
 */
export function buildWorkspacePicture(
  rows: WorkspaceRows,
  opts: { snapshot?: PortfolioSnapshot } = {},
): FinancialPicture {
  return buildFinancialPicture(
    financialPictureInputFromRows({
      profile: (rows.userProfile ?? null) as Parameters<
        typeof financialPictureInputFromRows
      >[0]["profile"],
      accounts: asArray(rows.accounts),
      accountDetails: asArray(rows.accountDetails),
      budgetEntries: asArray(rows.budgetEntries),
      taxRecords: asArray(rows.taxRecords),
    }),
    opts,
  );
}

/** The value of a known figure, or null for an unknown one. */
export function knownOrNull<T>(figure: Figure<T>): T | null {
  return isFigureKnown(figure) ? figure.value : null;
}
