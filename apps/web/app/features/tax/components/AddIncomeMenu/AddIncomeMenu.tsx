import type { TaxSource } from "@flump/finance-engine";
import { Button, Icon, Menu, type MenuEntry } from "@repo/ui";
import { ChevronDown, Plus } from "lucide-react";
import type { FC } from "react";
import { trigger } from "./AddIncomeMenu.styles";

export interface AddIncomeMenuProps {
  /** Opens the record dialog for a source, as income or a cost. */
  onAdd: (source: TaxSource, type: "income" | "expense") => void;
  /** Opens the copy dialog with last year's records. */
  onCopyFromLastYear: () => void;
  /** `primary` when this is the page's main action; `secondary` beside another primary. */
  variant?: "primary" | "secondary";
}

/**
 * The page's one "Add income" control (E16 PR 8). It replaces the per-source add, quick add and
 * copy buttons: every way to add a record, including copying last year's, is an item here.
 */
export const AddIncomeMenu: FC<AddIncomeMenuProps> = ({
  onAdd,
  onCopyFromLastYear,
  variant = "primary",
}) => {
  const items: MenuEntry[] = [
    {
      id: "add-self-employed",
      label: "Self-employed income",
      onSelect: () => onAdd("self-employed", "income"),
    },
    { id: "add-rental", label: "Rental income", onSelect: () => onAdd("rental", "income") },
    {
      id: "add-savings",
      label: "Savings interest or dividends",
      onSelect: () => onAdd("savings", "income"),
    },
    { id: "add-payslip", label: "Payslip", onSelect: () => onAdd("paye", "income") },
    { id: "add-cost", label: "Cost", onSelect: () => onAdd("self-employed", "expense") },
    { type: "separator" },
    { id: "copy-last-year", label: "Copy from last year", onSelect: onCopyFromLastYear },
  ];

  return (
    <Menu
      aria-label="Add income"
      align="end"
      id="add-income-menu"
      items={items}
      trigger={
        <Button className={trigger()} data-testid="add-income" type="button" variant={variant}>
          <Icon icon={Plus} size="sm" />
          Add income
          <Icon icon={ChevronDown} size="sm" />
        </Button>
      }
    />
  );
};

export default AddIncomeMenu;
