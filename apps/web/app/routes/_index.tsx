import { css } from "@repo/ui/styled-system/css";
import type { ReactElement } from "react";
import { useTranslation } from "react-i18next";
import { FiDatabase, FiLock, FiPieChart, FiTrendingUp } from "react-icons/fi";
import type { LoaderFunctionArgs } from "react-router";
import { type MetaFunction, Link as RouterLink, useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import { getAuthSession } from "~/utils/utils";

export const meta: MetaFunction = (): { title: string }[] => [
  { title: "Flump | Smart Personal Finance & Asset Tracker" },
];

export const handle = {
  i18n: ["common", "home"],
};

export const loader = async (args: LoaderFunctionArgs) => {
  const { user } = await getAuthSession(args, { ensureSignedIn: false });
  return { user };
};

const Index = (): ReactElement => {
  const { t } = useTranslation();
  const { user } = useLoaderData<typeof loader>();

  const heroStyle = css({
    display: "flex",
    alignItems: "center",
    flexDirection: "column",
    gap: "24px",
    justifyContent: "center",
    marginLeft: "auto",
    marginRight: "auto",
    maxWidth: "3xl",
    marginBottom: "80px",
    paddingLeft: "16px",
    paddingRight: "16px",
    textAlign: "center",
  });

  const badgeStyle = css({
    borderRadius: "full",
    backgroundColor: "rgba(99, 99, 241, 0.15)",
    color: "primary",
    padding: "6px 12px",
    fontSize: "xs",
    fontWeight: "semibold",
  });

  const stackStyle = css({
    display: "flex",
    flexDirection: { base: "column", sm: "row" },
    gap: "16px",
    marginTop: "16px",
  });

  const featuresHeaderStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "48px",
    textAlign: "center",
  });

  const gridStyle = css({
    display: "grid",
    gap: "32px",
    gridTemplateColumns: { base: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" },
  });

  const cardStyle = css({
    backgroundColor: "surface",
    border: "1px solid",
    borderColor: "border",
    borderRadius: "xl",
    padding: "24px",
    boxShadow: "sm",
    transition: "all 0.3s ease",
    _hover: {
      transform: "translateY(-5px)",
      boxShadow: "md",
      borderColor: "primary",
    },
  });

  const iconWrapperStyle = (color: "blue" | "green" | "purple" | "red") => {
    const bgMap = {
      blue: "rgba(59, 130, 246, 0.1)",
      green: "rgba(16, 185, 129, 0.1)",
      purple: "rgba(139, 92, 246, 0.1)",
      red: "rgba(239, 68, 68, 0.1)",
    };
    const textMap = {
      blue: "rgb(59, 130, 246)",
      green: "rgb(16, 185, 129)",
      purple: "rgb(139, 92, 246)",
      red: "rgb(239, 68, 68)",
    };
    return css({
      display: "flex",
      alignItems: "center",
      backgroundColor: bgMap[color],
      color: textMap[color],
      borderRadius: "lg",
      width: "48px",
      height: "48px",
      fontSize: "24px",
      justifyContent: "center",
      marginBottom: "16px",
    });
  };

  return (
    <FLPBox style={{ paddingTop: "32px", paddingBottom: "64px" }}>
      {/* Hero Section */}
      <div className={heroStyle}>
        <span className={badgeStyle}>✨ Introducing Flump 1.22</span>
        <FLPHeading as="h1" color="blue.500" size="4xl">
          Your entire financial universe, simplified.
        </FLPHeading>
        <FLPText color="text.muted" fontSize="lg">
          Aggregate your current accounts, savings, credit cards, mortgages, and loans in one
          unified dashboard. Track monthly changes, visualize trends, and reach your goals.
        </FLPText>
        <div className={stackStyle}>
          {user ? (
            <FLPButton size="lg">
              <RouterLink style={{ color: "inherit", textDecoration: "none" }} to="/app/accounts">
                {t("dashboard")}
              </RouterLink>
            </FLPButton>
          ) : (
            <>
              <FLPButton size="lg">
                <RouterLink style={{ color: "inherit", textDecoration: "none" }} to="/login">
                  {t("signUp")}
                </RouterLink>
              </FLPButton>
              <FLPButton size="lg" variant="outline">
                <RouterLink style={{ color: "inherit", textDecoration: "none" }} to="/login">
                  {t("logIn")}
                </RouterLink>
              </FLPButton>
            </>
          )}
        </div>
      </div>

      {/* Feature Grid */}
      <FLPBox style={{ marginBottom: "80px", paddingLeft: "16px", paddingRight: "16px" }}>
        <div className={featuresHeaderStyle}>
          <FLPHeading as="h2" color="blue.500" size="xl">
            Everything you need to master your money
          </FLPHeading>
          <FLPText color="text.muted" fontSize="md">
            Features built to give you total clarity and control over your net worth.
          </FLPText>
        </div>

        <div className={gridStyle}>
          {/* Card 1 */}
          <div className={cardStyle}>
            <div className={iconWrapperStyle("blue")}>
              <FiDatabase />
            </div>
            <FLPHeading as="h3" color="blue.500" mb={2} size="md">
              Wealth Aggregation
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Current accounts, savings, debts, and investments. View all of your assets and
              liabilities in one place.
            </FLPText>
          </div>

          {/* Card 2 */}
          <div className={cardStyle}>
            <div className={iconWrapperStyle("green")}>
              <FiTrendingUp />
            </div>
            <FLPHeading as="h3" color="green.500" mb={2} size="md">
              Interactive Analytics
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Beautiful historical data charts showing month-over-month progress and account balance
              changes over time.
            </FLPText>
          </div>

          {/* Card 3 */}
          <div className={cardStyle}>
            <div className={iconWrapperStyle("purple")}>
              <FiPieChart />
            </div>
            <FLPHeading as="h3" color="purple.500" mb={2} size="md">
              Net Worth Tracking
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Calculate your overall net worth automatically by subtracting your loans and mortgages
              from your cash assets.
            </FLPText>
          </div>

          {/* Card 4 */}
          <div className={cardStyle}>
            <div className={iconWrapperStyle("red")}>
              <FiLock />
            </div>
            <FLPHeading as="h3" color="red.500" mb={2} size="md">
              Secure Auth
            </FLPHeading>
            <FLPText color="text.muted" fontSize="sm">
              Powered by WorkOS AuthKit. Log in instantly with enterprise-grade SSO, social logins,
              or passwordless email codes.
            </FLPText>
          </div>
        </div>
      </FLPBox>
    </FLPBox>
  );
};

export default Index;
