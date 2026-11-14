import { PageBody, PageHeader } from "@repo/ui";
import { type FC, useEffect } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { TakeHomeCalculator } from "~/features/take-home/components/TakeHomeCalculator";
import { useUserProfile } from "~/hooks/useUserProfile";
import { useFinancialBaseline } from "~/state/baseline.store";
import { pageRoot } from "./TakeHomeContainer.styles";

/** Take-home pay from saved figures, and what a pay rise would change. */
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
    <PageBody className={pageRoot()} data-testid="take-home-page" id="take-home-page">
      <PageHeader
        description="What you take home each month, and what a pay rise would change."
        title="Take-home pay"
      />
      <TakeHomeCalculator
        initialSalary={effectiveSalary}
        onApplyIncrease={(monthlyIncrease) =>
          // Router state, not the URL: no money values in links or history entries.
          navigate("/app/savings#forecast", { state: { payRise: Math.round(monthlyIncrease) } })
        }
      />
    </PageBody>
  );
};

export default TakeHomeContainer;
