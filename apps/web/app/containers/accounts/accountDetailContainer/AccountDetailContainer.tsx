import { css } from "@repo/ui/styled-system/css";
import { type FC, useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useLoaderData } from "react-router";
import AccountDetails from "~/components/accounts/AccountDetails";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPHeading from "~/components/core/typography/FLPHeading";
import type { loader } from "~/routes/app.accounts.$account";
import { currentYear, emptyObject } from "~/utils/utils";

const AccountDetailContainer: FC = () => {
  const { t } = useTranslation();
  const { account, accountDetails } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedValues, setEditedValues] = useState<{ [key: string]: { [key: string]: string } }>(
    emptyObject,
  );

  const availableYears = useMemo(
    () => accountDetails?.map(({ year }: { year?: number }) => year),
    [accountDetails],
  );

  const handleToggleEditMode = useCallback(() => setIsEditMode((prev) => !prev), []);
  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = event.target;
    const { month, year } = event.target.dataset;
    setEditedValues((prev) => ({
      ...prev,
      [year as string]: {
        ...(prev?.[year as string] ?? emptyObject),
        [month as string]: value,
      },
    }));
  }, []);

  const handleAddNewYear = useCallback(
    (selectedYear: number, yearToAdd: "current" | "prev" | "next") => {
      const nextYear = selectedYear + (yearToAdd === "prev" ? -1 : 1);
      const targetYear = yearToAdd === "current" ? currentYear : nextYear;

      fetcher.submit(
        {
          intent: "addYear",
          year: targetYear.toString(),
        },
        { method: "POST" },
      );
    },
    [fetcher],
  );

  const handleSaveValues = useCallback(
    (event: { preventDefault: () => void }) => {
      event.preventDefault();
      const updatedValues = Object.entries(editedValues).flatMap(([year, values]) =>
        Object.entries(values).map(([month, value]) => ({
          month: parseInt(month, 10),
          year: parseInt(year, 10),
          value: parseFloat(value),
        })),
      );

      fetcher.submit(
        {
          intent: "updateValues",
          values: JSON.stringify(updatedValues),
        },
        { method: "POST" },
      );

      handleToggleEditMode();
      setEditedValues(emptyObject);
    },
    [editedValues, fetcher, handleToggleEditMode],
  );

  const containerStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "40px",
  });

  const headerStyle = css({
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  });

  const titleGroupStyle = css({
    display: "flex",
    flexDirection: "column",
  });

  const actionsStyle = css({
    display: "flex",
    flexDirection: "row",
    gap: "12px",
  });

  return (
    <div className={containerStyle}>
      <div className={headerStyle}>
        <div className={titleGroupStyle}>
          <FLPHeading as="h2" size="sm">
            {account.type}
          </FLPHeading>
          <FLPHeading as="h1" size="xl">
            {account.name}
          </FLPHeading>
        </div>
        <div>
          <FLPButton
            disabled={isLoading}
            variant="outline"
            onClick={isEditMode ? handleSaveValues : handleToggleEditMode}
          >
            {isEditMode ? t("save") : t("edit")}
          </FLPButton>
        </div>
      </div>
      <AccountDetails
        editedValues={editedValues}
        isEditMode={isEditMode}
        onInputChange={handleInputChange}
      />

      <div className={actionsStyle}>
        {availableYears?.length ? (
          <>
            <FLPButton
              disabled={isLoading}
              size="sm"
              variant="outline"
              onClick={() => handleAddNewYear(availableYears?.[availableYears.length - 1], "prev")}
            >
              {t("addPrevYear")}
            </FLPButton>
            <FLPButton
              disabled={isLoading}
              size="sm"
              variant="outline"
              onClick={() => handleAddNewYear(availableYears?.[0], "next")}
            >
              {t("addNextYear")}
            </FLPButton>
          </>
        ) : (
          <FLPButton
            disabled={isLoading}
            size="sm"
            variant="outline"
            onClick={() => handleAddNewYear(new Date().getFullYear(), "current")}
          >
            {t("addCurrentYear")}
          </FLPButton>
        )}
      </div>
    </div>
  );
};

export default AccountDetailContainer;
