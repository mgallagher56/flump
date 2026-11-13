import { Section24Calculator } from "@repo/ui/calculators";
import type { FC } from "react";
import { useNavigate } from "react-router";

export const Section24Tool: FC = () => {
  const navigate = useNavigate();
  return <Section24Calculator onSaveAndContinue={() => navigate("/signup")} />;
};

export default Section24Tool;
