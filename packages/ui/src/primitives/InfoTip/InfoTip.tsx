import { Info } from "lucide-react";
import type { FC, ReactNode } from "react";
import { cx } from "../../../styled-system/css";
import { IconButton } from "../Button";
import { Icon } from "../Icon";
import { Popover, type PopoverProps } from "../Popover";
import { infoTipDefinitionRecipe, infoTipTriggerRecipe } from "./InfoTip.styles";

export interface InfoTipProps {
  /** The term being explained, for example "Personal Allowance". Shown as the popover heading. */
  term: string;
  /** Plain-English definition. */
  children: ReactNode;
  /** Accessible name for the trigger. Defaults to `About {term}`. */
  label?: string;
  side?: PopoverProps["side"];
  align?: PopoverProps["align"];
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Id for the popover body (also data-testid). */
  id?: string;
  className?: string;
}

/**
 * Glossary "i" button: click, tap, Enter or Space opens a small popover with the term and a
 * plain-English definition. Click based so it works on touch (never hover only). Escape or an
 * outside click closes it and focus returns to the button.
 */
export const InfoTip: FC<InfoTipProps> = ({
  term,
  children,
  label,
  side = "top",
  align = "start",
  open,
  defaultOpen,
  onOpenChange,
  id,
  className,
}) => (
  <Popover
    title={term}
    size="sm"
    showClose={false}
    side={side}
    align={align}
    open={open}
    defaultOpen={defaultOpen}
    onOpenChange={onOpenChange}
    id={id}
    trigger={
      <IconButton
        label={label ?? `About ${term}`}
        size="sm"
        variant="ghost"
        className={cx(infoTipTriggerRecipe(), className)}
      >
        <Icon icon={Info} size="sm" />
      </IconButton>
    }
  >
    <p className={infoTipDefinitionRecipe()}>{children}</p>
  </Popover>
);

export default InfoTip;
