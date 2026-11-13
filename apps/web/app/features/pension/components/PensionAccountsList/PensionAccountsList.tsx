import {
  Button,
  Card,
  CollapsibleDrawer,
  EmptyState,
  Icon,
  Illustration,
  Money,
  Num,
  StatusBadge,
  Table,
  TBody,
  Td,
  THead,
  Th,
  VisuallyHidden,
} from "@repo/ui";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";
import { type FC, useMemo, useState } from "react";
import { useFetcher, useNavigate } from "react-router";
import type { Account } from "~/containers/accounts/types";
import { ConfirmDialog } from "~/features/feedback/components/ConfirmDialog";
import { useFetcherOutcome } from "~/features/feedback/hooks/useFetcherOutcome";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { AddPensionAccountDialog } from "../AddPensionAccountDialog";
import {
  accountCell,
  accountLink,
  actionsCell,
  allocationBar,
  allocationHeader,
  allocationLegend,
  allocationLegendItem,
  allocationNote,
  allocationPanel,
  drawerWrap,
  layoutDesktop,
  layoutMobile,
  listMeta,
  listRoot,
  listTitle,
  mobileActions,
  mobileCard,
  mobileFigure,
  mobileFigureLabel,
  mobileFigures,
  mobileIdentity,
  mobileList,
  mobileTop,
  mutedFigure,
  potDot,
  potFill,
} from "./PensionAccountsList.styles";

export interface PensionAccountsListProps {
  accounts: Account[];
  onOpenAddModal: () => void;
  isMobile?: boolean;
  variant?: "desktop" | "mobile";
}

/** Law 3: a table over eight rows keeps the rest behind a drawer. */
const VISIBLE_ROWS = 8;
const SMALL_POT_LIMIT = 5000;

const tone = (index: number) => (index % 8) as 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;

const StatusTag: FC<{ isCurrent: boolean }> = ({ isCurrent }) => (
  <StatusBadge size="sm" variant={isCurrent ? "brand" : "neutral"}>
    {isCurrent ? "Current pot" : "Past pot"}
  </StatusBadge>
);

const rateOf = (acc: Account): number | null =>
  acc.interestRate === undefined || acc.interestRate === null ? null : Number(acc.interestRate);

export const PensionAccountsList: FC<PensionAccountsListProps> = ({
  accounts,
  onOpenAddModal,
  isMobile: propIsMobile,
  variant,
}) => {
  // Without an explicit variant both layouts render and CSS shows the one that fits the width.
  const forcedLayout: "mobile" | "desktop" | null =
    propIsMobile !== undefined ? (propIsMobile ? "mobile" : "desktop") : (variant ?? null);
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const { formatCurrency } = useFormatCurrency();

  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [accountToDelete, setAccountToDelete] = useState<Account | null>(null);
  const deleteOutcome = useFetcherOutcome(fetcher, { onSuccess: () => setAccountToDelete(null) });

  const totalBalance = useMemo(
    () => accounts.reduce((sum, acc) => sum + (Number(acc.balance) || 0), 0),
    [accounts],
  );
  const smallPotsCount = useMemo(
    () =>
      accounts.length >= 2
        ? accounts.filter((acc) => {
            const bal = Number(acc.balance) || 0;
            return bal > 0 && bal < SMALL_POT_LIMIT;
          }).length
        : 0,
    [accounts],
  );
  const pastPotsCount = accounts.filter((acc) => acc.isCurrent === false).length;
  const currentPotsCount = accounts.length - pastPotsCount;

  const confirmDelete = () => {
    if (!accountToDelete?.id) return;
    deleteOutcome.begin();
    fetcher.submit(
      { intent: "deletePensionAccount", accountId: accountToDelete.id },
      { method: "POST", action: "/app/pension" },
    );
  };

  const shareOf = (acc: Account) =>
    totalBalance > 0 ? ((Number(acc.balance) || 0) / totalBalance) * 100 : 0;

  const directLabel = (acc: Account, short: boolean) => {
    const isCurrent = acc.isCurrent !== false;
    const direct = isCurrent ? Number(acc.monthlyContribution) || 0 : 0;
    if (!isCurrent) return short ? "None (past)" : "None (past pot)";
    if (direct > 0) {
      return (
        <>
          <Money fractionDigits={0} size="sm" value={direct} />
          {short ? " a month" : "/mo"}
        </>
      );
    }
    return "From salary";
  };

  const renderRows = (rows: Account[], offset: number) => (
    <Table caption="Pension pots">
      <THead>
        <tr>
          <Th>Pot</Th>
          <Th>Status</Th>
          <Th numeric>Balance</Th>
          <Th numeric>Share</Th>
          <Th numeric>Expected return</Th>
          <Th>Regular payment</Th>
          <Th>
            <VisuallyHidden>Actions</VisuallyHidden>
          </Th>
        </tr>
      </THead>
      <TBody>
        {rows.map((acc, idx) => {
          const isCurrent = acc.isCurrent !== false;
          return (
            <tr key={acc.id ?? acc.name}>
              <Td>
                <div className={accountCell()}>
                  <span aria-hidden="true" className={potDot({ tone: tone(offset + idx) })} />
                  {acc.id ? (
                    <button
                      className={accountLink()}
                      title="View monthly balance history"
                      type="button"
                      onClick={() => navigate(`/app/accounts/${acc.id}`)}
                    >
                      {acc.name}
                      <Icon icon={ExternalLink} size="sm" />
                    </button>
                  ) : (
                    <span>{acc.name}</span>
                  )}
                </div>
              </Td>
              <Td>
                <StatusTag isCurrent={isCurrent} />
              </Td>
              <Td numeric>
                <Money fractionDigits={0} size="sm" value={Number(acc.balance) || 0} />
              </Td>
              <Td numeric>
                <span className={mutedFigure()}>
                  <Num
                    fractionDigits={1}
                    kind="percent"
                    size="sm"
                    tone="muted"
                    value={shareOf(acc)}
                  />
                </span>
              </Td>
              <Td numeric>
                <Num
                  fractionDigits={1}
                  kind="percent"
                  notSetLabel="Not set"
                  size="sm"
                  value={rateOf(acc)}
                />
              </Td>
              <Td>
                <span className={mutedFigure()}>{directLabel(acc, false)}</span>
              </Td>
              <Td>
                <div className={actionsCell()}>
                  <Button
                    aria-label={`Edit ${acc.name}`}
                    size="sm"
                    title="Edit pot"
                    variant="ghost"
                    onClick={() => setEditingAccount(acc)}
                  >
                    <Icon icon={Pencil} size="sm" />
                  </Button>
                  <Button
                    aria-label={`Delete ${acc.name}`}
                    size="sm"
                    title="Delete pot"
                    variant="ghost"
                    onClick={() => setAccountToDelete(acc)}
                  >
                    <Icon icon={Trash2} size="sm" />
                  </Button>
                </div>
              </Td>
            </tr>
          );
        })}
      </TBody>
    </Table>
  );

  const visible = accounts.slice(0, VISIBLE_ROWS);
  const rest = accounts.slice(VISIBLE_ROWS);

  const mobileLayout = (
    <div
      className={mobileList()}
      data-testid="pension-accounts-mobile-list"
      id="pension-accounts-mobile-list"
    >
      {accounts.map((acc, idx) => (
        <div key={acc.id ?? acc.name} className={mobileCard()}>
          <div className={mobileTop()}>
            <div className={mobileIdentity()}>
              <span className={accountCell()}>
                <span aria-hidden="true" className={potDot({ tone: tone(idx) })} />
                <button
                  className={accountLink()}
                  type="button"
                  onClick={() => acc.id && navigate(`/app/accounts/${acc.id}`)}
                >
                  {acc.name}
                  <Icon icon={ExternalLink} size="sm" />
                </button>
              </span>
              <StatusTag isCurrent={acc.isCurrent !== false} />
            </div>
            <Money fractionDigits={0} size="md" value={Number(acc.balance) || 0} />
          </div>
          <div className={mobileFigures()}>
            <div className={mobileFigure()}>
              <span className={mobileFigureLabel()}>Share</span>
              <Num fractionDigits={1} kind="percent" size="sm" value={shareOf(acc)} />
            </div>
            <div className={mobileFigure()}>
              <span className={mobileFigureLabel()}>Return</span>
              <Num fractionDigits={1} kind="percent" size="sm" value={rateOf(acc)} />
            </div>
            <div className={mobileFigure()}>
              <span className={mobileFigureLabel()}>Regular payment</span>
              <span className={mutedFigure()}>{directLabel(acc, true)}</span>
            </div>
          </div>
          <div className={mobileActions()}>
            <Button
              aria-label={`Edit ${acc.name}`}
              size="sm"
              variant="ghost"
              onClick={() => setEditingAccount(acc)}
            >
              <Icon icon={Pencil} size="sm" />
            </Button>
            <Button
              aria-label={`Delete ${acc.name}`}
              size="sm"
              variant="ghost"
              onClick={() => setAccountToDelete(acc)}
            >
              <Icon icon={Trash2} size="sm" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );

  const desktopLayout = (
    <Card padding="none">
      {renderRows(visible, 0)}
      {rest.length > 0 && (
        <div className={drawerWrap()}>
          <CollapsibleDrawer
            closedLabel="Show all"
            openLabel="Show fewer"
            title={`${rest.length} more ${rest.length === 1 ? "pot" : "pots"}`}
          >
            {renderRows(rest, VISIBLE_ROWS)}
          </CollapsibleDrawer>
        </div>
      )}
    </Card>
  );

  // Segment widths are SVG attributes, so the split needs no inline style.
  let cursor = 0;
  const segments = accounts.map((acc, idx) => {
    const width = shareOf(acc);
    const x = cursor;
    cursor += width;
    return { key: acc.id ?? acc.name, idx, width, x };
  });

  return (
    <section aria-labelledby="pension-pots-heading" className={listRoot()}>
      <div>
        <h2 className={listTitle()} id="pension-pots-heading">
          Your pension pots
        </h2>
        {accounts.length > 0 && (
          <p className={listMeta()}>
            <span>{accounts.length === 1 ? "1 pot" : `${accounts.length} pots`}</span>
            <span aria-hidden="true">·</span>
            <Money size="sm" value={totalBalance} />
            <span>in total</span>
          </p>
        )}
      </div>

      {accounts.length >= 2 && totalBalance > 0 && (
        <div className={allocationPanel()}>
          <div className={allocationHeader()}>
            <span>Pot allocation</span>
            <span>
              {accounts.length} pots ({currentPotsCount} current
              {pastPotsCount > 0 ? `, ${pastPotsCount} past` : ""}), {formatCurrency(totalBalance)}{" "}
              in total
            </span>
          </div>
          <svg
            aria-hidden="true"
            className={allocationBar()}
            preserveAspectRatio="none"
            viewBox="0 0 100 10"
          >
            {segments.map((s) => (
              <rect
                key={s.key}
                className={potFill({ tone: tone(s.idx) })}
                height="10"
                width={s.width}
                x={s.x}
              />
            ))}
          </svg>
          <ul className={allocationLegend()}>
            {accounts.map((acc, idx) => (
              <li key={acc.id ?? acc.name} className={allocationLegendItem()}>
                <span aria-hidden="true" className={potDot({ tone: tone(idx) })} />
                {acc.name} ({shareOf(acc).toFixed(0)}%)
              </li>
            ))}
          </ul>
          {(smallPotsCount > 0 || pastPotsCount > 0) && (
            <p className={allocationNote()}>
              {pastPotsCount > 0
                ? `${pastPotsCount} past ${pastPotsCount === 1 ? "pot" : "pots"}`
                : null}
              {pastPotsCount > 0 && smallPotsCount > 0 ? " and " : null}
              {smallPotsCount > 0
                ? `${smallPotsCount} ${smallPotsCount === 1 ? "pot" : "pots"} under ${formatCurrency(SMALL_POT_LIMIT)}`
                : null}
              .
            </p>
          )}
        </div>
      )}

      {accounts.length === 0 ? (
        <Card padding="none">
          <EmptyState
            action={
              <Button onClick={onOpenAddModal}>
                <Icon icon={Plus} size="sm" />
                Add your first pension pot
              </Button>
            }
            description="No individual pension pots tracked yet. Contributions are worked out from your salary until you add one."
            headingLevel="h3"
            illustration={<Illustration scene="onboarding" />}
            title="No pension pots yet"
          />
        </Card>
      ) : forcedLayout === "mobile" ? (
        mobileLayout
      ) : forcedLayout === "desktop" ? (
        desktopLayout
      ) : (
        <>
          <div className={layoutMobile()}>{mobileLayout}</div>
          <div className={layoutDesktop()}>{desktopLayout}</div>
        </>
      )}

      {editingAccount && (
        <AddPensionAccountDialog
          accountToEdit={editingAccount}
          isOpen={true}
          onClose={() => setEditingAccount(null)}
        />
      )}

      <ConfirmDialog
        open={accountToDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setAccountToDelete(null);
            deleteOutcome.dismiss();
          }
        }}
        pending={deleteOutcome.pending}
        error={deleteOutcome.error}
        title={`Delete ${accountToDelete?.name || "this pension pot"}?`}
        description="This deletes the pension pot and its history. This can't be undone."
        confirmLabel="Delete pot"
        tone="danger"
        onConfirm={confirmDelete}
      />
    </section>
  );
};

export default PensionAccountsList;
