import { Icon } from "@repo/ui";
import { Lock } from "lucide-react";
import { type FC, type ReactNode, useId } from "react";
import { useTranslation } from "react-i18next";
import { hint, item } from "./DisabledNavItem.styles";

export interface DisabledNavItemProps {
  id: string;
  label: string;
  icon?: ReactNode;
}

/**
 * A navigation destination that is not available in the signed-out sandbox. It stays focusable with
 * aria-disabled and a no-op activation, and a visible "Sign up to open" hint describes it.
 */
export const DisabledNavItem: FC<DisabledNavItemProps> = ({ id, label, icon }) => {
  const { t } = useTranslation();
  const hintId = useId();
  return (
    <button
      aria-describedby={hintId}
      aria-disabled="true"
      className={item()}
      data-testid={id}
      id={id}
      type="button"
      onClick={(event) => event.preventDefault()}
    >
      {icon}
      <span>{label}</span>
      <span className={hint()} id={hintId}>
        <Icon icon={Lock} size="sm" />
        {t("signUpToOpen", "Sign up to open")}
      </span>
    </button>
  );
};
