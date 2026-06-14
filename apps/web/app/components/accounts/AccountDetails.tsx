import { css } from "@repo/ui/styled-system/css";
import type { ChangeEvent, FC } from "react";
import { Fragment, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useFetcher, useLoaderData } from "react-router";
import FLPButton from "~/components/core/buttons/FLPButton";
import FLPInput from "~/components/core/inputs/input/FLPInput";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import type { loader } from "~/routes/app.accounts.$account";

import { accountDetailDisplayStyles } from "./AccountDetailsStyles";

interface AccountDetailsProps {
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  editedValues: { [key: string]: { [key: string]: string } };
  isEditMode: boolean;
}

const AccountDetails: FC<AccountDetailsProps> = ({ onInputChange, editedValues, isEditMode }) => {
  const { t } = useTranslation();
  const { account, accountDetails } = useLoaderData<typeof loader>();
  const fetcher = useFetcher();

  const onRemoveYear = useCallback(
    (year: number) => {
      fetcher.submit(
        {
          intent: "deleteYear",
          year: year.toString(),
        },
        { method: "POST" },
      );
    },
    [fetcher],
  );

  const containerStyle = css({
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    overflow: "auto",
  });

  const headerStyle = css({
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: "12px",
  });

  return (
    <div className={containerStyle}>
      {accountDetails
        .map(({ year }: { year?: number }) => year)
        .filter(
          (
            value: number,
            index: number,
            self: {
              indexOf: (arg0: number) => number;
            },
          ) => self.indexOf(value) === index,
        )
        .map((year: number) => (
          <Fragment key={year}>
            <div className={headerStyle}>
              <FLPHeading as="h3" size="lg">
                {year}
              </FLPHeading>
              <FLPButton size="sm" variant="ghost" onClick={() => onRemoveYear(year)}>
                {t("deleteYear")}
              </FLPButton>
            </div>
            <div className={accountDetailDisplayStyles}>
              {accountDetails.map(
                ({
                  month,
                  year: currentYear,
                  value,
                }: {
                  month?: number;
                  year?: number;
                  value?: number;
                }) => {
                  if (year !== currentYear) return null;
                  const monthName = new Date(0, month - 1).toLocaleString("default", {
                    month: "long",
                  });
                  return (
                    <div key={`${year}-${month}`}>
                      <FLPText>{monthName}</FLPText>
                      {isEditMode ? (
                        <FLPInput
                          isLabelHidden
                          data-month={month}
                          data-year={year}
                          label={`${year}-${monthName}`}
                          name="amount"
                          placeholder="0.00"
                          type="number"
                          value={editedValues?.[year]?.[month] ?? value}
                          onChange={onInputChange}
                        />
                      ) : (
                        <FLPText>
                          {Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" })
                            .format(value)
                            .slice(0, -3)}
                        </FLPText>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          </Fragment>
        ))}
    </div>
  );
};

export default AccountDetails;
