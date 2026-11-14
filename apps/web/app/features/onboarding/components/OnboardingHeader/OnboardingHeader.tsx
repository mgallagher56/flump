import { Button, Heading, HomeLogo, Text } from "@repo/ui";
import type { FC } from "react";
import { renderHomeLogoLink } from "~/components/navigation/renderHomeLogoLink";
import { onboardingHeaderRecipe } from "./OnboardingHeader.styles";

export interface OnboardingHeaderProps {
  /** Shows "Save and exit", which keeps the answers given so far and leaves setup. */
  onSaveAndExit?: () => void;
  /** True while "Save and exit" is saving. */
  isSaving?: boolean;
}

/** The focused setup shell's header: logo, title and "Save and exit". No app navigation. */
export const OnboardingHeader: FC<OnboardingHeaderProps> = ({
  onSaveAndExit,
  isSaving = false,
}) => {
  const classes = onboardingHeaderRecipe();
  return (
    <header className={classes.root}>
      <HomeLogo renderLink={renderHomeLogoLink} />
      <div className={classes.text}>
        <Heading as="h1" size="md">
          Set up Flump
        </Heading>
        <Text className={classes.lead} color="secondary" textStyle="body.sm">
          Add what you know. You can change your details later.
        </Text>
      </div>
      {onSaveAndExit ? (
        <Button
          className={classes.exit}
          onClick={onSaveAndExit}
          pending={isSaving}
          size="sm"
          type="button"
          variant="outline"
        >
          {isSaving ? "Saving…" : "Save and exit"}
        </Button>
      ) : null}
    </header>
  );
};
