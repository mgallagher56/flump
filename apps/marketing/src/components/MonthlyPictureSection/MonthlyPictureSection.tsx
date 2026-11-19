import { Card, IconTile, Illustration } from "@repo/ui";
import { CalendarCheck, House, type LucideIcon, Wallet } from "lucide-react";
import type { FC } from "react";
import { Link } from "react-router-dom";
import { MarketingSection } from "../MarketingSection";
import {
  pictureBody,
  pictureCard,
  pictureFooter,
  pictureFooterRow,
  pictureGrid,
  pictureIconTile,
  pictureIllustration,
  pictureLink,
  pictureTitle,
} from "./MonthlyPictureSection.styles";

export interface MonthlyPictureItem {
  id: string;
  title: string;
  body: string;
  icon: LucideIcon;
}

/**
 * "What you can see" (E16 PR 12): three cards, one per part of the product, with no figures.
 * Renting and paying a mortgage sit side by side with equal weight (owner rule). The three icon
 * tiles share one tint (P74): each card spans several money domains, so none takes a domain colour.
 */
export const MONTHLY_PICTURE_ITEMS: MonthlyPictureItem[] = [
  {
    id: "each-month",
    title: "Where you stand each month",
    body: "Your breathing room and what is left over each month, from a few rough figures, whether you rent or pay a mortgage.",
    icon: CalendarCheck,
  },
  {
    id: "home-and-debts",
    title: "What a change would do",
    body: "See an estimate for a new fixed rate or an overpayment, or for paying debts highest rate first or smallest balance first.",
    icon: House,
  },
  {
    id: "pay-and-pension",
    title: "Your pay and pension",
    body: "See how a pay rise or salary sacrifice changes your take-home pay, and add your pension to see an estimate beside the rest.",
    icon: Wallet,
  },
];

export const MonthlyPictureSection: FC = () => (
  <MarketingSection
    id="what-you-can-see"
    subtitle="Flump works under UK tax rules and uses only the figures you enter."
    title="What you can see"
    tone="apricot"
  >
    <ul aria-label="What you can see" className={pictureGrid()}>
      {MONTHLY_PICTURE_ITEMS.map((item) => (
        <Card
          aria-labelledby={`picture-${item.id}`}
          as="li"
          className={pictureCard()}
          key={item.id}
          padding="lg"
        >
          <IconTile className={pictureIconTile()} icon={item.icon} tone="teal" />
          <h3 className={pictureTitle()} id={`picture-${item.id}`}>
            {item.title}
          </h3>
          <p className={pictureBody()}>{item.body}</p>
        </Card>
      ))}
    </ul>
    {/* No figures in this band, so the scene pushes nothing down on a phone (B10). */}
    <div className={pictureFooterRow()}>
      <div className={pictureIllustration()} data-testid="what-you-can-see-illustration">
        <Illustration scene="empty-savings" size="sm" settle={false} />
      </div>
      <p className={pictureFooter()}>
        Want to try one first, without signing in?{" "}
        <Link className={pictureLink()} to="/tools">
          Browse the calculators
        </Link>
      </p>
    </div>
  </MarketingSection>
);

export default MonthlyPictureSection;
