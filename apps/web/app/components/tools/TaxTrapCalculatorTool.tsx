import { TaxTrapCalculator } from "@repo/ui/calculators";
import type { FC } from "react";
import { useNavigate } from "react-router";

export const TaxTrapCalculatorTool: FC = () => {
  const navigate = useNavigate();
  return <TaxTrapCalculator onSaveAndContinue={() => navigate("/signup")} />;
};

export default TaxTrapCalculatorTool;
