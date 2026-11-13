import { Heading, Text } from "@repo/ui";
import type { FC } from "react";
import HomeLogo from "~/components/navigation/HomeLogo";
import { onboardingHeaderRecipe } from "./OnboardingHeader.styles";

export const OnboardingHeader: FC = () => {
  const classes = onboardingHeaderRecipe();
  return (
    <header className={classes.root}>
      <HomeLogo />
      <div className={classes.text}>
        <Heading as="h1" size="md">
          Set up your finances
        </Heading>
        <Text color="secondary" textStyle="body.sm">
          Add what you know. You can skip any step and change your details later.
        </Text>
      </div>
    </header>
  );
};
