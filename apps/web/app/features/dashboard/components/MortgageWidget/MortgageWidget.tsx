import { Money } from "@repo/ui";
import type { FC } from "react";
import { WIDGET_ICONS } from "../../widgetIcons";
import { WidgetCard } from "../WidgetCard";

export interface MortgageWidgetProps {
  data: {
    mortgageBalance: number;
    hasMortgageAccount: boolean;
  };
}

/** The mortgage section card: the saved balance on the mortgage account. */
export const MortgageWidget: FC<MortgageWidgetProps> = ({ data }) => {
  const balance = Math.abs(Number(data.mortgageBalance) || 0);
  const known = data.hasMortgageAccount && balance > 0;
  return (
    <WidgetCard
      domain="mortgage"
      figure={known ? <Money fractionDigits={0} size="lg" value={balance} /> : null}
      icon={WIDGET_ICONS.mortgage}
      id="mortgage"
      label="Mortgage balance"
      line={known ? "From your mortgage account." : "Add your mortgage to see its balance here."}
      link={
        known
          ? { to: "/app/mortgage", label: "Open mortgage" }
          : { to: "/app/accounts", label: "Add your mortgage" }
      }
      title="Mortgage"
    />
  );
};

export default MortgageWidget;
