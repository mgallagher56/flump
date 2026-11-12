import { css } from "@repo/ui/styled-system/css";
import { type FC, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import UKTaxCalculator from "~/components/forecast/UKTaxCalculator";
import { useUserProfile } from "~/hooks/useUserProfile";
import { useFinancialBaseline } from "~/state/baseline.store";

const containerStyle = css({
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  paddingBottom: "48px",
});

const headerStyle = css({ marginTop: "16px", marginBottom: "8px" });

/** Take-home pay, the £100k tax trap and pay-rise effect. Moved out of Savings (IA review T-IA-3). */
export const TakeHomeContainer: FC = () => {
  const loaderData = useLoaderData<any>();
  const navigate = useNavigate();
  const { profile, setProfile } = useUserProfile();
  const { baseline } = useFinancialBaseline();
  const userProfile = loaderData?.userProfile;

  useEffect(() => {
    if (userProfile) setProfile(userProfile);
  }, [userProfile, setProfile]);

  const effectiveSalary =
    baseline.annualGrossSalary > 0 ? baseline.annualGrossSalary : Number(profile.annualSalary || 0);

  return (
    <div className={containerStyle}>
      <div className={headerStyle}>
        <FLPHeading as="h1" color="text.primary" size="2xl">
          Take-home pay
        </FLPHeading>
        <FLPText color="text.muted" fontSize="sm" style={{ marginTop: "4px" }}>
          What you actually take home, what the £100k tax trap costs, and what a pay rise or salary
          sacrifice changes.
        </FLPText>
      </div>
      <UKTaxCalculator
        initialSalary={effectiveSalary}
        onApplyIncrease={(monthlyIncrease) =>
          navigate(`/app/savings?payRise=${Math.round(monthlyIncrease)}#forecast`)
        }
      />
    </div>
  );
};

export default TakeHomeContainer;
