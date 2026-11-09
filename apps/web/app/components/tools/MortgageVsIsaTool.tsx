import { MortgageVsIsaCalculator } from "@repo/ui/calculators";
import type { FC } from "react";
import { useNavigate } from "react-router";

export const MortgageVsIsaTool: FC = () => {
  const navigate = useNavigate();
  return <MortgageVsIsaCalculator onSaveAndContinue={() => navigate("/signUp")} />;
};

export default MortgageVsIsaTool;
