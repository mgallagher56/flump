import * as Dialog from "@radix-ui/react-dialog";
import { Button, Icon, InlineAlert } from "@repo/ui";
import type { FC } from "react";
import type { DashboardWidgetKey } from "~/utils/pageConfig";
import { WIDGET_ICONS } from "../../widgetIcons";
import {
  panelCheckbox,
  panelContent,
  panelDescription,
  panelFooter,
  panelList,
  panelOverlay,
  panelRow,
  panelRowHint,
  panelRowLabel,
  panelRowStatus,
  panelRowText,
  panelTitle,
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
}

/** The panel's one rule, said once. Disabled boxes point to it. */
export const SECTION_RULE = (max: number) =>
  `Up to ${max} sections show on your dashboard, in this order.`;

/** What each section card shows, in plain words (no "AER", "salary sacrifice" or "0% deal"). */
export const SECTION_COPY: Record<DashboardWidgetKey, { label: string; description: string }> = {
  accounts: { label: "Accounts", description: "How many accounts you have added" },
  budget: { label: "Budget", description: "What you spend each month" },
  debt: { label: "Debt", description: "What you owe and when it could be paid off" },
  savings: { label: "Savings", description: "What you have in savings and investments" },
  pension: { label: "Pension", description: "Your pension pots and what is paid in" },
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
  maxVisible = 4,
  shownKeys,
}) => {
  const atCap = widgetKeys.filter((k) => visibleKeys.includes(k)).length >= maxVisible;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={panelOverlay()} />
        <Dialog.Content className={panelContent()} data-focus-managed id="widget-visibility-panel">
          <Dialog.Title className={panelTitle()}>Choose what shows here</Dialog.Title>
          <Dialog.Description className={panelDescription()} id="widget-visibility-rule">
            {SECTION_RULE(maxVisible)}
          </Dialog.Description>
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
          <div className={panelFooter()}>
            <Dialog.Close asChild>
              <Button id="widget-visibility-done" size="sm" variant="primary">
                Done
              </Button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
};
