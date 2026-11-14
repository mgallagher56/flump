import {
  Building2,
  CreditCard,
  GraduationCap,
  House,
  Layers,
  type LucideIcon,
  Percent,
  PoundSterling,
  Wallet,
} from "lucide-react";
import type { ToolIconName } from "./toolCatalog";

/** One icon per tool for both apps. No dollar sign anywhere (E16 PR 11). */
export const TOOL_ICONS: Record<ToolIconName, LucideIcon> = {
  layers: Layers,
  "credit-card": CreditCard,
  wallet: Wallet,
  house: House,
  "graduation-cap": GraduationCap,
  "pound-sterling": PoundSterling,
  building: Building2,
  percent: Percent,
};
