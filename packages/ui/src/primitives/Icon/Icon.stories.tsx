import type { Meta, StoryObj } from "@storybook/react";
import { expect, within } from "@storybook/test";
import {
  AlertTriangle,
  ArrowRight,
  Banknote,
  Calculator,
  Calendar,
  Check,
  CheckCircle,
  ChevronDown,
  Clock,
  CreditCard,
  Home,
  Info,
  Landmark,
  Lock,
  type LucideIcon,
  Percent,
  PieChart,
  PiggyBank,
  Plus,
  Shield,
  SlidersHorizontal,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
} from "lucide-react";
import { css } from "../../../styled-system/css";
import { Icon } from "./Icon";

const GALLERY: ReadonlyArray<readonly [string, LucideIcon]> = [
  ["AlertTriangle", AlertTriangle],
  ["ArrowRight", ArrowRight],
  ["Banknote", Banknote],
  ["Calculator", Calculator],
  ["Calendar", Calendar],
  ["Check", Check],
  ["CheckCircle", CheckCircle],
  ["ChevronDown", ChevronDown],
  ["Clock", Clock],
  ["CreditCard", CreditCard],
  ["Home", Home],
  ["Info", Info],
  ["Landmark", Landmark],
  ["Lock", Lock],
  ["Percent", Percent],
  ["PieChart", PieChart],
  ["PiggyBank", PiggyBank],
  ["Plus", Plus],
  ["Shield", Shield],
  ["SlidersHorizontal", SlidersHorizontal],
  ["Trash2", Trash2],
  ["TrendingDown", TrendingDown],
  ["TrendingUp", TrendingUp],
  ["X", X],
];

const IconGallery = () => (
  <div
    className={css({
      p: "24px",
      backgroundColor: "surface.canvas",
      color: "text.primary",
      display: "grid",
      gap: "24px",
    })}
  >
    <h1 className={css({ textStyle: "heading.lg" })}>Icons (Lucide)</h1>
    <ul
      className={css({
        display: "grid",
        gridTemplateColumns: { base: "repeat(2, 1fr)", md: "repeat(4, 1fr)", lg: "repeat(6, 1fr)" },
        gap: "16px",
      })}
    >
      {GALLERY.map(([name, icon]) => (
        <li
          key={name}
          className={css({
            display: "flex",
            alignItems: "center",
            gap: "8px",
            p: "12px",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.subtle",
            borderRadius: "md",
            backgroundColor: "surface.card",
            textStyle: "body.sm",
          })}
        >
          <Icon icon={icon} size="sm" />
          <Icon icon={icon} size="md" />
          <Icon icon={icon} size="lg" />
          <span>{name}</span>
        </li>
      ))}
    </ul>
    <section aria-labelledby="icon-accessibility" className={css({ display: "grid", gap: "8px" })}>
      <h2 id="icon-accessibility" className={css({ textStyle: "heading.sm" })}>
        Accessibility
      </h2>
      <p className={css({ textStyle: "body.sm", color: "text.secondary" })}>
        Decorative icons are hidden from assistive technology. An icon that carries meaning on its
        own takes a label.
      </p>
      <div className={css({ display: "flex", gap: "16px", alignItems: "center" })}>
        <span className={css({ display: "inline-flex", gap: "8px", alignItems: "center" })}>
          <Icon icon={TrendingUp} />
          Net worth up
        </span>
        <Icon icon={AlertTriangle} label="Warning" />
      </div>
    </section>
  </div>
);

const meta: Meta<typeof Icon> = {
  title: "2. Primitives/Icon",
  component: Icon,
  parameters: { layout: "fullscreen" },
  render: () => <IconGallery />,
};

export default meta;
type Story = StoryObj<typeof Icon>;

export const Gallery: Story = {
  globals: { theme: "light" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const labelled = canvas.getByRole("img", { name: "Warning" });
    await expect(labelled).toBeInTheDocument();
    // Only the one labelled icon is exposed; the other 72 gallery icons are decorative.
    await expect(canvas.getAllByRole("img")).toHaveLength(1);
    const hidden = canvasElement.querySelectorAll('svg[aria-hidden="true"]');
    await expect(hidden.length).toBeGreaterThan(70);
  },
};

export const Dark: Story = { globals: { theme: "dark" } };
