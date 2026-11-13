import { Icon } from "@repo/ui";
import { BarChart3, Plus, Scale } from "lucide-react";
import type { FC } from "react";
import { CATEGORY_LABELS } from "~/types/budget";
import { categoryIcon } from "../../categoryIcons";
import { navBar, navButton, navDivider, navGroup } from "./BudgetNav.styles";

export interface BudgetNavProps {
  /** `dashboard`, `runway` or a category key. */
  activeTab: string;
  categoryTabs: string[];
  onSelectTab: (tab: string) => void;
  onOpenRunway: () => void;
  onAddCategory: () => void;
}

const labelFor = (cat: string) =>
  CATEGORY_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);

/** Views and category ledgers in one scrollable bar. Plain buttons keep the existing test ids. */
export const BudgetNav: FC<BudgetNavProps> = ({
  activeTab,
  categoryTabs,
  onSelectTab,
  onOpenRunway,
  onAddCategory,
}) => (
  <nav aria-label="Budget sections" className={navBar()}>
    <div className={navGroup()}>
      <button
        aria-current={activeTab === "dashboard" ? "page" : undefined}
        className={navButton({ active: activeTab === "dashboard" })}
        data-testid="budget-tab-overview"
        id="budget-tab-overview"
        type="button"
        onClick={() => onSelectTab("dashboard")}
      >
        <Icon icon={BarChart3} size="sm" />
        Overview
      </button>
      <button
        aria-current={activeTab === "runway" ? "page" : undefined}
        className={navButton({ active: activeTab === "runway" })}
        data-testid="budget-tab-runway"
        id="budget-tab-runway"
        type="button"
        onClick={onOpenRunway}
      >
        <Icon icon={Scale} size="sm" />
        Runway
      </button>
    </div>
    <span aria-hidden="true" className={navDivider()} />
    <div className={navGroup()}>
      {categoryTabs.map((cat) => (
        <button
          key={cat}
          aria-current={activeTab === cat ? "page" : undefined}
          className={navButton({ active: activeTab === cat, kind: "category" })}
          data-testid={`budget-tab-${cat}`}
          id={`budget-tab-${cat}`}
          type="button"
          onClick={() => onSelectTab(cat)}
        >
          <Icon icon={categoryIcon(cat)} size="sm" />
          {labelFor(cat)}
        </button>
      ))}
      <button
        className={navButton({ kind: "add" })}
        data-testid="add-category-btn"
        id="add-category-btn"
        type="button"
        onClick={onAddCategory}
      >
        <Icon icon={Plus} size="sm" />
        Add category
      </button>
    </div>
  </nav>
);
