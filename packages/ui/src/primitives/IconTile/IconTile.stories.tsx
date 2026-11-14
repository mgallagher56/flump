import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import {
  Banknote,
  CreditCard,
  House,
  Landmark,
  type LucideIcon,
  PiggyBank,
  Receipt,
  TrendingUp,
} from "lucide-react";
import { css } from "../../../styled-system/css";
import { IconTile, type IconTileDomain } from "./IconTile";

const meta: Meta<typeof IconTile> = {
  title: "2. Primitives/IconTile",
  component: IconTile,
  parameters: { layout: "padded" },
  args: { icon: PiggyBank, domain: "savings" },
};

export default meta;
type Story = StoryObj<typeof IconTile>;

const DOMAINS: { domain: IconTileDomain; icon: LucideIcon; label: string }[] = [
  { domain: "net-worth", icon: TrendingUp, label: "Net worth" },
  { domain: "mortgage", icon: House, label: "Mortgage" },
  { domain: "pension", icon: Landmark, label: "Pension" },
  { domain: "savings", icon: PiggyBank, label: "Savings" },
  { domain: "debt", icon: CreditCard, label: "Debts" },
  { domain: "pay", icon: Banknote, label: "Take-home pay" },
  { domain: "tax", icon: Receipt, label: "Tax" },
];

const list = css({
  listStyle: "none",
  margin: "0",
  padding: "0",
  display: "grid",
  gap: "3",
  gridTemplateColumns: { base: "1fr", sm: "repeat(2, minmax(0, 1fr))" },
  maxWidth: "36rem",
});
const row = css({ display: "flex", alignItems: "center", gap: "3" });
const name = css({ textStyle: "body.md", color: "text.primary" });

const DomainList = () => (
  <ul className={list}>
    {DOMAINS.map(({ domain, icon, label }) => (
      <li className={row} key={domain}>
        <IconTile domain={domain} icon={icon} />
        <span className={name}>{label}</span>
      </li>
    ))}
  </ul>
);

const domainsPlay: Story["play"] = async ({ canvasElement }) => {
  const canvas = within(canvasElement);
  await expect(canvas.getAllByRole("listitem")).toHaveLength(DOMAINS.length);
  const tones = Array.from(canvasElement.querySelectorAll("[data-tile-tone]")).map((el) =>
    el.getAttribute("data-tile-tone"),
  );
  await expect(tones).toEqual(["teal", "teal", "teal", "sage", "apricot", "neutral", "neutral"]);
  // Beside a visible name the tile is decorative.
  for (const el of Array.from(canvasElement.querySelectorAll("[data-tile-tone]"))) {
    await expect(el).toHaveAttribute("aria-hidden", "true");
  }
};

/** One colour per domain: teal for net worth, mortgage and pension, sage for savings, apricot for debt, neutral for pay and tax. */
export const Domains: Story = { render: () => <DomainList />, play: domainsPlay };

export const DomainsDark: Story = {
  render: () => <DomainList />,
  globals: { theme: "dark" },
  play: domainsPlay,
};

/** With no visible text beside it, give the tile a label so it has a name. */
export const Labelled: Story = {
  args: { label: "Savings" },
  play: async ({ canvasElement }) => {
    await expect(within(canvasElement).getByRole("img", { name: "Savings" })).toBeInTheDocument();
  },
};
