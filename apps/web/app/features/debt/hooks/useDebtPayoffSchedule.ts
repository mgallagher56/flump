import {
  calculateDebtSchedule,
  compareAvalancheAndSnowball,
  type DebtItem,
} from "@flump/finance-engine";
import { useMemo, useState } from "react";

export function useDebtPayoffSchedule(initialDebts: DebtItem[]) {
  const [debts, setDebts] = useState<DebtItem[]>(initialDebts);
  const [selectedStrategy, setSelectedStrategy] = useState<"avalanche" | "snowball">("avalanche");
  const [extraPayment, setExtraPayment] = useState<number>(50);

  const comparison = useMemo(() => {
    return compareAvalancheAndSnowball(debts, extraPayment);
  }, [debts, extraPayment]);

  const scheduleResult = useMemo(() => {
    return calculateDebtSchedule(
      debts,
      extraPayment,
      selectedStrategy.toUpperCase() as "AVALANCHE" | "SNOWBALL",
    );
  }, [debts, extraPayment, selectedStrategy]);

  return {
    debts,
    setDebts,
    selectedStrategy,
    setSelectedStrategy,
    extraPayment,
    setExtraPayment,
    comparison,
    scheduleResult,
    promoCliffAlerts: scheduleResult.promoCliffAlerts.filter((a) => a.hasCliffRisk),
  };
}

export default useDebtPayoffSchedule;
