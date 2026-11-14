import * as Dialog from "@radix-ui/react-dialog";
import { Button, Icon, InlineAlert } from "@repo/ui";
import type { FC } from "react";
import { DASHBOARD_WIDGET_METAS, type DashboardWidgetKey } from "~/utils/pageConfig";
import { WIDGET_ICONS } from "../../widgetIcons";
import {
  panelCapHint,
  panelCheckbox,
  panelContent,
  panelDescription,
  panelFooter,
  panelList,
  panelOverlay,
  panelRow,
  panelRowHint,
  panelRowLabel,
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
  /** Most sections the dashboard draws. At the cap, unticked boxes are disabled with one hint. */
  maxVisible?: number;
}

/** Shown once the cap is reached, and linked to each disabled box. */
export const SECTION_CAP_HINT = (max: number) => `Up to ${max} sections show here.`;

/** "Choose what shows here": only ever changes which sections appear, never their order. */
export const WidgetVisibilityPanel: FC<WidgetVisibilityPanelProps> = ({
  open,
  onOpenChange,
  widgetKeys,
  visibleKeys,
  onToggle,
  error,
  maxVisible = 4,
}) => {
  const atCap = widgetKeys.filter((k) => visibleKeys.includes(k)).length >= maxVisible;
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={panelOverlay()} />
        <Dialog.Content className={panelContent()} data-focus-managed id="widget-visibility-panel">
          <Dialog.Title className={panelTitle()}>Choose what shows here</Dialog.Title>
          <Dialog.Description className={panelDescription()}>
            Choose which sections appear on your dashboard. Up to four show at a time, and the order
            stays the same.
          </Dialog.Description>
          {error ? <InlineAlert tone="danger">{error}</InlineAlert> : null}
          {atCap ? (
            <p
              className={panelCapHint()}
              data-testid="widget-visibility-cap"
              id="widget-visibility-cap"
            >
              {SECTION_CAP_HINT(maxVisible)}
            </p>
          ) : null}
          <ul className={panelList()}>
            {widgetKeys.map((key) => {
              const meta = DASHBOARD_WIDGET_METAS[key];
              const inputId = `widget-visibility-${key}`;
              const checked = visibleKeys.includes(key);
              const disabled = atCap && !checked;
              return (
                <li key={key}>
                  <label className={panelRow()} htmlFor={inputId}>
                    <input
                      aria-describedby={disabled ? "widget-visibility-cap" : undefined}
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
                      <span className={panelRowLabel()}>{meta.label}</span>
                      <span className={panelRowHint()}>{meta.description}</span>
                    </span>
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
