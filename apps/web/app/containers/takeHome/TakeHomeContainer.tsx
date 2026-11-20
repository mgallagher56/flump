import { PageBody, PageHeader } from "@repo/ui";
import { type FC, useMemo } from "react";
import { useLoaderData, useNavigate } from "react-router";
import { TakeHomeCalculator } from "~/features/take-home/components/TakeHomeCalculator";
import { normalizeProfile, useUserProfile } from "~/hooks/useUserProfile";
import { salaryProfileFirst } from "~/utils/profileFirst";
import { pageRoot } from "./TakeHomeContainer.styles";

/** Take-home pay from saved figures, and what a pay rise would change. */
const TakeHomeContainer: FC = () => {
  const loaderData = useLoaderData<any>();
  const navigate = useNavigate();
  const { profile: rootProfile } = useUserProfile();
  const userProfile = loaderData?.userProfile;
  // Loader data only (audit slice 8): this page's saved profile, else the root loader's.
  const profile = useMemo(
    () => (userProfile ? normalizeProfile(userProfile) : rootProfile),
    [userProfile, rootProfile],
  );
  const effectiveSalary = salaryProfileFirst(profile);

  return (
    <PageBody className={pageRoot()} data-testid="take-home-page" id="take-home-page">
      <PageHeader
        description="What you take home each month, and what a pay rise would change."
        title="Take-home pay"
      />
      <TakeHomeCalculator
        initialSalary={effectiveSalary}
        // The saved row from the first render.
        profile={profile}
        onApplyIncrease={(monthlyIncrease) =>
          // Router state, not the URL: no money values in links or history entries.
          navigate("/app/savings#forecast", { state: { payRise: Math.round(monthlyIncrease) } })
        }
      />
    </PageBody>
  );
};

export default TakeHomeContainer;
