import {
  getCategoriesForSource,
  getRecordAnnualTotalForTaxYear,
  isRecordActiveInTaxYear,
  type TaxRecord,
  type TaxSource,
} from "@flump/finance-engine";
import {
  Button,
  Card,
  CollapsibleDrawer,
  Icon,
  Money,
  StatusBadge,
  Table,
  TBody,
  Td,
  TextInput,
  THead,
  Th,
} from "@repo/ui";
import { ChevronRight, Copy, FileImage, FileText, Pencil, Plus, Trash2 } from "lucide-react";
import { type FC, type ReactNode, useMemo, useState } from "react";
import { nativeSelect } from "../../select.styles";
import { FREQUENCY_LABEL, recordAmount } from "../../tax-labels";
import {
  actions,
  body,
  buttonGroup,
  card,
  cellMuted,
  chevron,
  clickableRow,
  empty,
  emptyText,
  iconButton,
  iconTile,
  identity,
  metric,
  metricLabel,
  metrics,
  metricsRow,
  perMonth,
  quickAddForm,
  receiptButton,
  receiptIcon,
  recordName,
  secondaryLine,
  subtitle as subtitleStyle,
  summary as summaryStyle,
  titleRow,
  title as titleStyle,
  toolbar,
} from "./TaxIncomeSectionCard.styles";

/** A table of more than this many rows lives in a drawer (AGENTS.md law 3). */
const DRAWER_THRESHOLD = 8;

const BADGE_VARIANT = {
  blue: "info",
  emerald: "positive",
  amber: "warning",
  purple: "neutral",
} as const;

const dateFormat = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});
const formatDate = (iso: string) => {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : dateFormat.format(d);
};

export interface TaxIncomeSectionCardProps {
  source: TaxSource;
  title: string;
  subtitle: string;
  icon: ReactNode;
  colorScheme: "blue" | "emerald" | "amber" | "purple";
  records: TaxRecord[];
  selectedTaxYear: string;
  previousTaxYear: string;
  isOpenDefault?: boolean;
  onOpenAddModal: (source: TaxSource, type?: "income" | "expense") => void;
  onOpenEditModal: (record: TaxRecord) => void;
  onDeleteRecord: (id: string, e: React.MouseEvent) => void;
  onOpenCopyModal: (source: TaxSource) => void;
  onQuickAdd: (record: {
    name: string;
    source: TaxSource;
    type: "income" | "expense";
    category: string;
    amount: number;
    frequency: "one-off" | "monthly" | "annual";
    date: string;
  }) => void;
  onViewReceipt: (record: TaxRecord) => void;
  contextBanner?: ReactNode;
}

/** One collapsible card per income source, with its records for the selected tax year. */
export const TaxIncomeSectionCard: FC<TaxIncomeSectionCardProps> = ({
  source,
  title,
  subtitle,
  icon,
  colorScheme,
  records,
  selectedTaxYear,
  previousTaxYear,
  isOpenDefault = true,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteRecord,
  onOpenCopyModal,
  onQuickAdd,
  onViewReceipt,
  contextBanner,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(isOpenDefault);
  const [showQuickAdd, setShowQuickAdd] = useState<boolean>(false);

  // Quick add state
  const categories = useMemo(() => getCategoriesForSource(source), [source]);
  const [quickName, setQuickName] = useState<string>("");
  const [quickType, setQuickType] = useState<"income" | "expense">("income");
  const [quickCategory, setQuickCategory] = useState<string>(categories[0]?.id || "");
  const [quickAmount, setQuickAmount] = useState<string>("");
  const [quickFrequency, setQuickFrequency] = useState<"one-off" | "monthly" | "annual">("monthly");

  // Filter records active in this section and tax year
  const sectionRecords = useMemo(() => {
    return records.filter(
      (r) => r.source === source && isRecordActiveInTaxYear(r, selectedTaxYear),
    );
  }, [records, source, selectedTaxYear]);

  // Totals for this section in the selected tax year
  const { totalIncome, totalExpenses, netTotal } = useMemo(() => {
    let inc = 0;
    let exp = 0;
    for (const r of sectionRecords) {
      const annualVal = getRecordAnnualTotalForTaxYear(r, selectedTaxYear);
      if (r.type === "income") inc += annualVal;
      else exp += annualVal;
    }
    return {
      totalIncome: inc,
      totalExpenses: exp,
      netTotal: inc - exp,
    };
  }, [sectionRecords, selectedTaxYear]);

  const handleQuickSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickName.trim() || !quickAmount) return;

    // Use 6 April (tax year start) of the selected tax year start
    const startYear = selectedTaxYear.split("/")[0];
    const defaultDate = `${startYear}-04-06`;

    onQuickAdd({
      name: quickName.trim(),
      source,
      type: quickType,
      category: quickCategory,
      amount: Number.parseFloat(quickAmount) || 0,
      frequency: quickFrequency,
      date: defaultDate,
    });

    setQuickName("");
    setQuickAmount("");
    setShowQuickAdd(false);
  };

  const getCategoryLabel = (catId: string) => {
    return categories.find((c) => c.id === catId)?.name || catId;
  };

  const recordCount = sectionRecords.length;

  const table = (
    <Table caption={`${title} records for ${selectedTaxYear}`}>
      <THead>
        <tr>
          <Th>Record</Th>
          <Th>Category</Th>
          <Th>How often</Th>
          <Th numeric>Amount</Th>
          <Th numeric>Total in {selectedTaxYear}</Th>
          <Th>Receipt</Th>
          <Th numeric>Actions</Th>
        </tr>
      </THead>
      <TBody>
        {sectionRecords.map((record) => {
          const isIncome = record.type === "income";
          const amt = recordAmount(record);
          const annualVal = getRecordAnnualTotalForTaxYear(record, selectedTaxYear);

          return (
            <tr key={record.id} className={clickableRow()} onClick={() => onOpenEditModal(record)}>
              <Td>
                <span className={recordName()}>{record.name}</span>
                {record.endDate ? (
                  <span className={secondaryLine()}>until {formatDate(record.endDate)}</span>
                ) : null}
              </Td>
              <Td className={cellMuted()}>{getCategoryLabel(record.category)}</Td>
              <Td className={cellMuted()}>{FREQUENCY_LABEL[record.frequency]}</Td>
              <Td numeric>
                <Money
                  fractionDigits={2}
                  signDisplay="always"
                  size="sm"
                  tone={isIncome ? "positive" : "default"}
                  value={isIncome ? amt || 0 : -(amt || 0)}
                />
                {record.frequency === "monthly" ? <span className={perMonth()}>/mo</span> : null}
              </Td>
              <Td numeric>
                <Money
                  fractionDigits={2}
                  signDisplay="always"
                  size="sm"
                  tone={isIncome ? "positive" : "danger"}
                  value={isIncome ? annualVal : -annualVal}
                />
              </Td>
              <Td>
                {record.hasReceipt ? (
                  <button
                    className={receiptButton()}
                    type="button"
                    onClick={() => onViewReceipt(record)}
                  >
                    <span
                      className={receiptIcon({
                        kind: record.receiptMimeType?.includes("pdf") ? "pdf" : "image",
                      })}
                    >
                      <Icon
                        icon={record.receiptMimeType?.includes("pdf") ? FileText : FileImage}
                        size="sm"
                      />
                    </span>
                    View
                  </button>
                ) : (
                  <span className={cellMuted()}>-</span>
                )}
              </Td>
              <Td numeric>
                <span className={actions()}>
                  <button
                    aria-label="Edit record"
                    className={iconButton()}
                    title="Edit record"
                    type="button"
                    onClick={() => onOpenEditModal(record)}
                  >
                    <Icon icon={Pencil} size="sm" />
                  </button>
                  <button
                    aria-label="Delete record"
                    className={iconButton({ tone: "danger" })}
                    title="Delete record"
                    type="button"
                    onClick={(e) => onDeleteRecord(record.id, e)}
                  >
                    <Icon icon={Trash2} size="sm" />
                  </button>
                </span>
              </Td>
            </tr>
          );
        })}
      </TBody>
    </Table>
  );

  return (
    <Card as="section" className={card()} elevation="resting" padding="none">
      <details open={isOpen} onToggle={(e) => setIsOpen((e.target as HTMLDetailsElement).open)}>
        <summary className={summaryStyle()}>
          <div className={identity()}>
            <div className={iconTile({ tone: colorScheme })}>{icon}</div>
            <div>
              <div className={titleRow()}>
                <span className={titleStyle()}>{title}</span>
                <StatusBadge size="sm" variant={BADGE_VARIANT[colorScheme]}>
                  {recordCount} {recordCount === 1 ? "record" : "records"}
                </StatusBadge>
              </div>
              <span className={subtitleStyle()}>{subtitle}</span>
            </div>
          </div>

          <div className={metricsRow()}>
            <div className={metrics()}>
              {totalIncome > 0 && (
                <div className={metric()}>
                  <span className={metricLabel()}>Income</span>
                  <Money
                    fractionDigits={2}
                    signDisplay="always"
                    size="sm"
                    tone="positive"
                    value={totalIncome}
                  />
                </div>
              )}
              {totalExpenses > 0 && (
                <div className={metric()}>
                  <span className={metricLabel()}>Expenses</span>
                  <Money
                    fractionDigits={2}
                    signDisplay="always"
                    size="sm"
                    tone="danger"
                    value={-totalExpenses}
                  />
                </div>
              )}
              <div className={metric()}>
                <span className={metricLabel()}>Annual net ({selectedTaxYear})</span>
                <Money
                  fractionDigits={2}
                  size="md"
                  tone={netTotal >= 0 ? "default" : "danger"}
                  value={netTotal}
                />
              </div>
            </div>

            <span aria-hidden="true" className={chevron({ open: isOpen })}>
              <Icon icon={ChevronRight} size="sm" />
            </span>
          </div>
        </summary>

        <div className={body()}>
          {contextBanner ? <div>{contextBanner}</div> : null}

          <div className={toolbar()}>
            <div className={buttonGroup()}>
              <Button size="sm" type="button" onClick={() => onOpenAddModal(source, "income")}>
                <Icon icon={Plus} size="sm" /> Add income
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onOpenAddModal(source, "expense")}
              >
                <Icon icon={Plus} size="sm" /> Add expense
              </Button>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => setShowQuickAdd((v) => !v)}
              >
                {showQuickAdd ? "Hide quick add" : "Quick add"}
              </Button>
            </div>

            <div className={buttonGroup()}>
              <Button
                size="sm"
                type="button"
                variant="outline"
                onClick={() => onOpenCopyModal(source)}
              >
                <Icon icon={Copy} size="sm" /> Copy from {previousTaxYear}
              </Button>
            </div>
          </div>

          {showQuickAdd && (
            <form className={quickAddForm()} onSubmit={handleQuickSubmit}>
              <TextInput
                aria-label="Name"
                placeholder="e.g. Flat rent, client retainer, interest"
                required
                size="sm"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
              />

              <select
                aria-label="Type"
                className={nativeSelect()}
                value={quickType}
                onChange={(e) => {
                  const t = e.target.value as "income" | "expense";
                  setQuickType(t);
                  const first = categories.find((c) => c.type === t)?.id || categories[0]?.id || "";
                  setQuickCategory(first);
                }}
              >
                <option value="income">Income</option>
                <option value="expense">Expense</option>
              </select>

              <select
                aria-label="Category"
                className={nativeSelect()}
                value={quickCategory}
                onChange={(e) => setQuickCategory(e.target.value)}
              >
                {categories
                  .filter((c) => c.type === quickType)
                  .map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
              </select>

              <TextInput
                aria-label="Amount in pounds"
                min="0"
                placeholder="Amount (£)"
                required
                size="sm"
                step="0.01"
                type="number"
                value={quickAmount}
                onChange={(e) => setQuickAmount(e.target.value)}
              />

              <select
                aria-label="How often"
                className={nativeSelect()}
                value={quickFrequency}
                onChange={(e) =>
                  setQuickFrequency(e.target.value as "one-off" | "monthly" | "annual")
                }
              >
                <option value="monthly">Monthly</option>
                <option value="annual">Annual</option>
                <option value="one-off">One-off</option>
              </select>

              <Button size="sm" type="submit">
                Add
              </Button>
            </form>
          )}

          {recordCount === 0 ? (
            <div className={empty()}>
              <p className={emptyText()}>
                No records for {title} in {selectedTaxYear} yet.
              </p>
              <div className={buttonGroup()}>
                <Button size="sm" type="button" onClick={() => onOpenAddModal(source, "income")}>
                  <Icon icon={Plus} size="sm" /> Add record
                </Button>
                <Button
                  size="sm"
                  type="button"
                  variant="outline"
                  onClick={() => onOpenCopyModal(source)}
                >
                  <Icon icon={Copy} size="sm" /> Copy from {previousTaxYear}
                </Button>
              </div>
            </div>
          ) : recordCount > DRAWER_THRESHOLD ? (
            <CollapsibleDrawer
              closedLabel="Show records"
              itemCount={recordCount}
              itemNoun={{ one: "record", other: "records" }}
              openLabel="Hide records"
              title={`Records for ${selectedTaxYear}`}
            >
              {table}
            </CollapsibleDrawer>
          ) : (
            table
          )}
        </div>
      </details>
    </Card>
  );
};

export default TaxIncomeSectionCard;
