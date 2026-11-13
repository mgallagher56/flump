import { Home, Landmark, LineChart, PiggyBank, Wallet } from "lucide-react";
import { Icon } from "../../primitives/Icon/Icon";
import type { AppNavItem } from "./AppNav.types";

/** Sample manifest for stories and tests. Home first; Borrowing (debt) sits in slot four. */
export const sampleNavItems: AppNavItem[] = [
  { key: "home", label: "Home", href: "/", icon: <Icon icon={Home} size="sm" /> },
  { key: "accounts", label: "Accounts", href: "/accounts", icon: <Icon icon={Wallet} size="sm" /> },
  {
    key: "plan",
    label: "Plan",
    href: "/forecast",
    icon: <Icon icon={LineChart} size="sm" />,
    children: [
      {
        key: "forecast",
        label: "Forecast",
        href: "/forecast",
        description: "See where your money could be in future",
      },
      {
        key: "pension",
        label: "Pension",
        href: "/pension",
        description: "Project your retirement pot",
      },
    ],
  },
  {
    key: "borrowing",
    label: "Borrowing",
    href: "/debt",
    icon: <Icon icon={Landmark} size="sm" />,
    badge: 2,
  },
  { key: "saving", label: "Saving", href: "/saving", icon: <Icon icon={PiggyBank} size="sm" /> },
];
