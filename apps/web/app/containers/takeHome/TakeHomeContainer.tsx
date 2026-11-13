import { PageHeader } from "@repo/ui";
import { type FC, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { TakeHomeCalculator } from "~/features/take-home/components/TakeHomeCalculator";
import { useUserProfile } from "~/hooks/useUserProfile";
import { useFinancialBaseline } from "~/state/baseline.store";
import { pageRoot } from "./TakeHomeContainer.styles";

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
    <div className={pageRoot()}>
      <PageHeader
        subtitle="What you take home, what the £100k tax trap costs, and what a pay rise or salary sacrifice changes."
        title="Your take-home pay"
      />
      <TakeHomeCalculator
        initialSalary={effectiveSalary}
        onApplyIncrease={(monthlyIncrease) =>
          // Router state, not the URL: no money values in links or history entries.
          navigate("/app/savings#forecast", { state: { payRise: Math.round(monthlyIncrease) } })
        }
      />
    </div>
  );
};

export default TakeHomeContainer;
