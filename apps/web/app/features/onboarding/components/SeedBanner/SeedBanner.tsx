import { Button, Icon, Text } from "@repo/ui";
import { CircleCheck } from "lucide-react";
import type { FC } from "react";
import { useFormatCurrency } from "~/hooks/useFormatCurrency";
import { seedBannerRecipe } from "./SeedBanner.styles";

export interface SeedBannerProps {
  /** Annual salary carried over from a calculator, when there is one. */
  salary?: number;
  hasNumbers: boolean;
  canFinish: boolean;
  /** Plain words for what is missing, shown when Finish is not yet possible. */
  missingForFinish: string | null;
  isSubmitting: boolean;
  onLaunch: () => void;
  onReview: () => void;
}

export const SeedBanner: FC<SeedBannerProps> = ({
  salary,
  hasNumbers,
  canFinish,
  missingForFinish,
  isSubmitting,
  onLaunch,
  onReview,
}) => {
  const classes = seedBannerRecipe();
  const { formatCurrency } = useFormatCurrency();
  const message = !hasNumbers ? (
    "Your demo choices are remembered. Add your own numbers to continue."
  ) : salary ? (
    <>
      {"We've pre-loaded your "}
      <span className={classes.figure} data-testid="seed-salary" id="seed-salary">
        {formatCurrency(salary)}
      </span>
      {" salary and savings from the calculator."}
    </>
  ) : (
    "We've pre-loaded your savings from the calculator."
  );
  return (
    <div className={classes.root} data-testid="seed-banner" id="seed-banner">
      <div className={classes.message}>
        <span className={classes.icon}>
          <Icon icon={CircleCheck} size="md" />
        </span>
        <span>{message}</span>
      </div>
      {!canFinish ? (
        <Text
          color="secondary"
          data-testid="seed-income-hint"
          id="seed-income-hint"
          role="status"
          textStyle="body.sm"
        >
          {missingForFinish} in the first step to finish setup.
        </Text>
      ) : null}
      <div className={classes.actions}>
        <Button
          aria-describedby={!canFinish ? "seed-income-hint" : undefined}
          disabled={!canFinish}
          onClick={onLaunch}
          pending={isSubmitting}
          size="sm"
          type="button"
        >
          {isSubmitting ? "Saving..." : "Finish with these numbers"}
        </Button>
        <Button onClick={onReview} size="sm" type="button" variant="outline">
          Review and edit numbers
        </Button>
      </div>
    </div>
  );
};
