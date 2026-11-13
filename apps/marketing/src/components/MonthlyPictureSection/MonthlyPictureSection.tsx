import { Card, SectionBand } from "@repo/ui";
import type { FC } from "react";
import {
  pictureBody,
  pictureCard,
  pictureExample,
  pictureEyebrow,
  pictureFigure,
  pictureGrid,
  pictureTitle,
} from "./MonthlyPictureSection.styles";

export interface MonthlyPictureItem {
  id: string;
  eyebrow: string;
  title: string;
  body: string;
  exampleLabel: string;
  exampleValue: string;
}

/** Illustrative figures match the hero preview card so the page tells one story. */
export const MONTHLY_PICTURE_ITEMS: MonthlyPictureItem[] = [
  {
    id: "cover",
    eyebrow: "Months of cover",
    title: "How long your savings would last",
    body: "The number of months your savings would cover your essential costs, including rent or mortgage. You choose the target that suits you. Flump does not set one.",
    exampleLabel: "Example",
    exampleValue: "6.4 months",
  },
  {
    id: "safe-to-spend",
    eyebrow: "Safe to spend",
    title: "What is free to use this week",
    body: "What is left after bills, housing costs and the amounts you have set aside, shown as a weekly figure.",
    exampleLabel: "Example",
    exampleValue: "£195 a week",
  },
  {
    id: "check-in",
    eyebrow: "Monthly check-in",
    title: "A short look at what changed",
    body: "Once a month, update your balances in a minute or two and see how your months of cover and net worth moved.",
    exampleLabel: "Example",
    exampleValue: "Net worth +£840",
  },
];

export const MonthlyPictureSection: FC = () => (
  <SectionBand
    id="monthly-picture"
    tone="subtle"
    indexBadge="Each month"
    title="Your monthly picture"
    subtitle="Three numbers that show where you stand, whether you rent, pay a mortgage or live with family."
  >
    <ul className={pictureGrid()} aria-label="Your monthly picture">
      {MONTHLY_PICTURE_ITEMS.map((item) => (
        <Card as="li" key={item.id} padding="lg" className={pictureCard()}>
          <span className={pictureEyebrow()}>{item.eyebrow}</span>
          <h3 className={pictureTitle()}>{item.title}</h3>
          <p className={pictureBody()}>{item.body}</p>
          <div className={pictureExample()}>
            <span>{item.exampleLabel}</span>
            <span className={pictureFigure()}>{item.exampleValue}</span>
          </div>
        </Card>
      ))}
    </ul>
  </SectionBand>
);

export default MonthlyPictureSection;
