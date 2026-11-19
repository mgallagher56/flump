import { Button, Icon, IconButton, InlineAlert, Sheet, VisuallyHidden } from "@repo/ui";
import { ChevronDown, ChevronUp } from "lucide-react";
import { type FC, useEffect, useRef, useState } from "react";
import type { DashboardWidgetKey } from "~/utils/pageConfig";
import { WIDGET_ICONS } from "../../widgetIcons";
import {
  panelBody,
  panelCheckbox,
  panelDescription,
  panelInert,
  panelItem,
  panelList,
  panelMoveGroup,
  panelOrderFooter,
  panelRow,
  panelRowHint,
  panelRowLabel,
  panelRowStatus,
  panelRowText,
  panelRowTitle,
} from "./WidgetVisibilityPanel.styles";

export interface WidgetVisibilityPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Sections the user can choose between, in the dashboard's section order. */
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
  /**
   * Moves a section one place up (-1) or down (1). With it, each row has move up and move down
   * buttons and the panel has a reset button. Without it the order cannot be changed here.
   */
  onMove?: (key: DashboardWidgetKey, offset: -1 | 1) => void;
  /** Puts the default section order back. */
  onResetOrder?: () => void;
  /** Whether the order is the default one already (the reset button is then inert). */
  orderIsDefault?: boolean;
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

/** The rule when the order can be changed too. */
export const ORDER_RULE =
  "Choose which sections show on your dashboard. Move a section up or down to change where it appears.";

export const RESET_ORDER_LABEL = "Reset to default order";

const moveLabel = (label: string, offset: -1 | 1) => `Move ${label} ${offset < 0 ? "up" : "down"}`;

export const SHOWING_LABEL = "Showing";
export const NOT_SHOWING_LABEL = "Not showing";

/**
 * "Choose what shows here": which sections appear and, when `onMove` is given, their order. Move
 * up and move down buttons work with keyboard, touch and pointer; focus stays on the button that
 * was pressed and a status line says where the section went (no drag needed).
 */
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
  onMove,
  onResetOrder,
  orderIsDefault = false,
}) => {
  const canReorder = Boolean(onMove);
  const [orderStatus, setOrderStatus] = useState("");
  // The button to focus once the rows are drawn in their new order: React may move the pressed
  // row's node, which drops focus.
  const refocusId = useRef<string | null>(null);
  // A failed save puts the order back, and a closed panel starts afresh: neither keeps saying a
  // section moved.
  useEffect(() => {
    if (error || !open) setOrderStatus("");
  }, [error, open]);
  useEffect(() => {
    if (!refocusId.current) return;
    document.getElementById(refocusId.current)?.focus();
    refocusId.current = null;
  });

  const move = (key: DashboardWidgetKey, offset: -1 | 1) => {
    const from = widgetKeys.indexOf(key);
    const to = from + offset;
    if (!onMove || from < 0 || to < 0 || to >= widgetKeys.length) return;
    refocusId.current = `widget-order-${key}-${offset < 0 ? "up" : "down"}`;
    onMove(key, offset);
    setOrderStatus(
      `${SECTION_COPY[key].label} moved to position ${to + 1} of ${widgetKeys.length}.`,
    );
  };

  const resetOrder = () => {
    if (!onResetOrder || orderIsDefault) return;
    onResetOrder();
    setOrderStatus("Sections are back in the default order.");
  };

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
          {canReorder
            ? maxVisible === undefined
              ? ORDER_RULE
              : `${SECTION_RULE(maxVisible)} Move a section up or down to change where it appears.`
            : SECTION_RULE(maxVisible)}
        </p>
        {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
        <ul className={panelList()}>
          {widgetKeys.map((key, index) => {
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
            const first = index === 0;
            const last = index === widgetKeys.length - 1;
            return (
              <li className={panelItem()} key={key}>
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
                    <span className={panelRowTitle()}>
                      <span className={panelRowLabel()}>{copy.label}</span>
                      {status ? (
                        <span
                          className={panelRowStatus({ shown: status === SHOWING_LABEL })}
                          data-testid={`${inputId}-status`}
                          id={`${inputId}-status`}
                        >
                          {status}
                        </span>
                      ) : null}
                    </span>
                    <span className={panelRowHint()}>{copy.description}</span>
                  </span>
                </label>
                {canReorder ? (
                  <span className={panelMoveGroup()}>
                    {/* aria-disabled, not disabled: the end buttons stay focusable, so focus is
                        never lost when a section reaches the top or the bottom. */}
                    <IconButton
                      aria-disabled={first}
                      className={panelInert()}
                      data-testid={`widget-order-${key}-up`}
                      id={`widget-order-${key}-up`}
                      label={moveLabel(copy.label, -1)}
                      size="sm"
                      onClick={() => move(key, -1)}
                    >
                      <Icon icon={ChevronUp} size="sm" />
                    </IconButton>
                    <IconButton
                      aria-disabled={last}
                      className={panelInert()}
                      data-testid={`widget-order-${key}-down`}
                      id={`widget-order-${key}-down`}
                      label={moveLabel(copy.label, 1)}
                      size="sm"
                      onClick={() => move(key, 1)}
                    >
                      <Icon icon={ChevronDown} size="sm" />
                    </IconButton>
                  </span>
                ) : null}
              </li>
            );
          })}
        </ul>
        {canReorder ? (
          <div className={panelOrderFooter()}>
            <Button
              aria-disabled={orderIsDefault}
              className={panelInert()}
              data-testid="widget-order-reset"
              id="widget-order-reset"
              size="sm"
              variant="ghost"
              onClick={resetOrder}
            >
              {RESET_ORDER_LABEL}
            </Button>
          </div>
        ) : null}
        <VisuallyHidden
          aria-atomic="true"
          aria-live="polite"
          data-testid="widget-order-status"
          id="widget-order-status"
          role="status"
        >
          {orderStatus}
        </VisuallyHidden>
      </div>
    </Sheet>
  );
};
