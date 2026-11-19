import { Button, Icon, InlineAlert, Sheet } from "@repo/ui";
import type { FC } from "react";
import type { DashboardWidgetKey } from "~/utils/pageConfig";
import { WIDGET_ICONS } from "../../widgetIcons";
import {
  panelBody,
  panelCheckbox,
  panelDescription,
  panelList,
  panelRow,
  panelRowHint,
  panelRowLabel,
  panelRowStatus,
  panelRowText,
} from "./WidgetVisibilityPanel.styles";

export interface WidgetVisibilityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sections the user can choose between, in the fixed dashboard order. */
  widgetKeys: DashboardWidgetKey[];
  /** Sections currently chosen. */
  visibleKeys: DashboardWidgetKey[];
  onToggle: (key: DashboardWidgetKey) => void;
  /** Failure copy from the last save. Shown inline; the checklist keeps the user's choice. */
  error?: string | null;
  /** Most sections the dashboard draws. At the cap, unticked boxes are disabled. */
  maxVisible?: number;
  /**
   * The sections the dashboard draws now, so each ticked row can say whether it shows. A ticked
   * section can be left out when the cap is reached or it has nothing to show yet.
   */
  shownKeys?: readonly DashboardWidgetKey[];
  /** Where focus goes on close when the sheet opened with nothing focused (see `Sheet`). */
  returnFocusTo?: () => HTMLElement | null;
}

/** The panel's one rule, said once. */
export const SECTION_RULE = (max?: number) =>
  max !== undefined
    ? `Up to ${max} sections show on your dashboard, in this order.`
    : "Choose which sections show on your dashboard. They appear in this order.";

/** What each section card shows, in plain words (no "AER", "salary sacrifice" or "0% deal"). */
export const SECTION_COPY: Record<DashboardWidgetKey, { label: string; description: string }> = {
  accounts: { label: "Accounts", description: "How many accounts you have added" },
  budget: { label: "Budget", description: "What you spend each month" },
  debt: { label: "Cards and loans", description: "What you owe and when it could be paid off" },
  savings: { label: "Savings", description: "What you have in savings and investments" },
  pension: { label: "Pension", description: "Your pension pots and what is paid in" },
  retirement: { label: "Retirement plan", description: "Your target and estimated yearly income" },
  mortgage: { label: "Mortgage", description: "What is left to pay on your mortgage" },
  tax: { label: "Self Assessment", description: "An estimate of tax on income outside PAYE" },
};

export const SHOWING_LABEL = "Showing";
export const NOT_SHOWING_LABEL = "Not showing";

/** "Choose what shows here": only ever changes which sections appear, never their order. */
export const WidgetVisibilityPanel: FC<WidgetVisibilityPanelProps> = ({
  open,
  onOpenChange,
  widgetKeys,
  visibleKeys,
  onToggle,
  error,
  maxVisible,
  shownKeys,
  returnFocusTo,
}) => {
  const atCap =
    maxVisible !== undefined &&
    widgetKeys.filter((k) => visibleKeys.includes(k)).length >= maxVisible;
  return (
    // The shared bottom sheet (P10, RC-5): a bottom sheet on a phone that sits above the bottom
    // bar, a close button, and focus back on the button that opened it.
    <Sheet
      footer={
        <Button
          id="widget-visibility-done"
          size="sm"
          variant="primary"
          onClick={() => onOpenChange(false)}
        >
          Done
        </Button>
      }
      id="widget-visibility-panel"
      open={open}
      returnFocusTo={returnFocusTo}
      title="Choose what shows here"
      onOpenChange={onOpenChange}
    >
      <div className={panelBody()}>
        {/* The rule, said once; a disabled box points to it (aria-describedby). */}
        <p className={panelDescription()} id="widget-visibility-rule">
          {SECTION_RULE(maxVisible)}
        </p>
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        <ul className={panelList()}>
          {widgetKeys.map((key) => {
            const copy = SECTION_COPY[key];
            const inputId = `widget-visibility-${key}`;
            const checked = visibleKeys.includes(key);
            const disabled = atCap && !checked;
            const status =
              shownKeys && checked
                ? shownKeys.includes(key)
                  ? SHOWING_LABEL
                  : NOT_SHOWING_LABEL
                : null;
            return (
              <li key={key}>
                <label className={panelRow()} htmlFor={inputId}>
                  <input
                    aria-describedby={disabled ? "widget-visibility-rule" : undefined}
                    checked={checked}
                    disabled={disabled}
                    className={panelCheckbox()}
                    data-testid={inputId}
                    id={inputId}
                    type="checkbox"
                    onChange={() => onToggle(key)}
                  />
                  <Icon icon={WIDGET_ICONS[key]} size="md" />
                  <span className={panelRowText()}>
                    <span className={panelRowLabel()}>{copy.label}</span>
                    <span className={panelRowHint()}>{copy.description}</span>
                  </span>
                  {status ? (
                    <span
                      className={panelRowStatus({ shown: status === SHOWING_LABEL })}
                      data-testid={`${inputId}-status`}
                      id={`${inputId}-status`}
                    >
                      {status}
                    </span>
                  ) : null}
                </label>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
};
