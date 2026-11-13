import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import type { LucideIcon } from "lucide-react";
import type { FC, ReactElement } from "react";
import { cx } from "../../../styled-system/css";
import { Icon } from "../Icon";
import {
  menuContentRecipe,
  menuGroupLabelRecipe,
  menuItemLabelRecipe,
  menuItemRecipe,
  menuSeparatorRecipe,
  menuShortcutRecipe,
} from "./Menu.styles";

export interface MenuActionItem {
  type?: "item";
  /** Stable key, also used for the item's id and data-testid. */
  id: string;
  /** Visible text. Also the typeahead text, so keep it a plain string. */
  label: string;
  onSelect?: (event: Event) => void;
  /** Optional Lucide glyph (decorative). */
  icon?: LucideIcon;
  /** `danger` styles destructive actions (delete, disconnect). */
  tone?: "default" | "danger";
  disabled?: boolean;
  /** Visual shortcut hint only, for example "Ctrl+K". Not wired to a handler. */
  shortcut?: string;
}

export interface MenuSeparatorItem {
  type: "separator";
  id?: string;
}

export interface MenuLabelItem {
  type: "label";
  id?: string;
  label: string;
}

export type MenuEntry = MenuActionItem | MenuSeparatorItem | MenuLabelItem;

export interface MenuProps {
  /** The element that opens the menu. Rendered as-is (`asChild`), so pass a button. */
  trigger: ReactElement;
  items: MenuEntry[];
  /** Accessible name for the menu. */
  "aria-label"?: string;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** data-testid for the menu content (Radix keeps its own id so aria-controls stays valid). */
  id?: string;
  className?: string;
}

/**
 * Dropdown menu on Radix: role="menu" with menuitems, arrow keys, Home/End, typeahead, Escape to
 * close and focus returned to the trigger. Disabled items are skipped by arrow navigation and cannot be selected (they stay
 * `aria-disabled`). Rendered in a portal.
 */
export const Menu: FC<MenuProps> = ({
  trigger,
  items,
  "aria-label": ariaLabel,
  side = "bottom",
  align = "start",
  open,
  defaultOpen,
  onOpenChange,
  id,
  className,
}) => (
  // Non-modal: the modal variant aria-hides focusable siblings, which trips axe aria-hidden-focus.
  <DropdownMenu.Root
    modal={false}
    open={open}
    defaultOpen={defaultOpen}
    onOpenChange={onOpenChange}
  >
    <DropdownMenu.Trigger asChild>{trigger}</DropdownMenu.Trigger>
    <DropdownMenu.Portal>
      <DropdownMenu.Content
        {...(id ? { "data-testid": id } : {})}
        aria-label={ariaLabel}
        {...(ariaLabel ? { "aria-labelledby": undefined } : {})}
        side={side}
        align={align}
        sideOffset={8}
        collisionPadding={16}
        className={cx(menuContentRecipe(), className)}
      >
        {items.map((entry, index) => {
          if (entry.type === "separator") {
            return (
              <DropdownMenu.Separator
                key={entry.id ?? `separator-${index}`}
                className={menuSeparatorRecipe()}
              />
            );
          }
          if (entry.type === "label") {
            return (
              <DropdownMenu.Label
                key={entry.id ?? `label-${index}`}
                className={menuGroupLabelRecipe()}
              >
                {entry.label}
              </DropdownMenu.Label>
            );
          }
          return (
            <DropdownMenu.Item
              key={entry.id}
              id={`menu-item-${entry.id}`}
              data-testid={`menu-item-${entry.id}`}
              disabled={entry.disabled}
              textValue={entry.label}
              onSelect={entry.onSelect}
              className={menuItemRecipe({ tone: entry.tone })}
            >
              {entry.icon ? <Icon icon={entry.icon} size="sm" /> : null}
              <span className={menuItemLabelRecipe()}>{entry.label}</span>
              {entry.shortcut ? (
                <span className={menuShortcutRecipe()}>{entry.shortcut}</span>
              ) : null}
            </DropdownMenu.Item>
          );
        })}
      </DropdownMenu.Content>
    </DropdownMenu.Portal>
  </DropdownMenu.Root>
);

export default Menu;
