import { Box, Grid } from "@chakra-ui/react";
import type { FC } from "react";
import { Fragment, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useLoaderData } from "react-router";
import AccountsCard from "~/components/core/cards/AccountsCard";
import FLPBox from "~/components/core/structure/FLPBox";
import FLPHeading from "~/components/core/typography/FLPHeading";
import FLPText from "~/components/core/typography/FLPText";
import AddEditAccountsDialogBtn from "~/components/dialogs/addEditAccountsDialog/AddEditAccountsDialog";
import type { Account, AccountDetail } from "~/containers/accounts/types";
import { AccountTypeEnum, isAccountTypeValid } from "~/containers/accounts/utils";
import type { loader } from "~/routes/app.accounts._index";
import { monthYearSort } from "~/utils/accounts";
import { currentMonth, currentYear } from "~/utils/utils";

const { CURRENT, SAVING, MORTGAGE, CREDIT_CARD, LOAN, OWED } = AccountTypeEnum;

const AccountsContainer: FC = () => {
  const { t } = useTranslation();
  const { accounts = [], accountDetails = [] } = useLoaderData<typeof loader>();
  const accountTypeArr = useMemo(() => [CURRENT, SAVING, CREDIT_CARD, MORTGAGE, LOAN, OWED], []);

  // Calculate Net Worth, Assets, Liabilities
  const stats = useMemo(() => {
    let totalAssets = 0;
    let totalLiabilities = 0;

    accounts.forEach((acc: Account) => {
      const accDetails = accountDetails
        .filter((detail: AccountDetail) => detail.account_id === acc.id)
        .sort(monthYearSort);

      if (accDetails.length === 0) return;

      const curIndex = accDetails.findIndex(
        (detail: AccountDetail) => detail.month === currentMonth && detail.year === currentYear,
      );

      let balance = 0;
      if (curIndex !== -1) {
        balance = accDetails[curIndex]?.value ?? 0;
      } else {
        balance = accDetails[accDetails.length - 1]?.value ?? 0;
      }

      const isAsset = [CURRENT, SAVING, OWED].includes(acc.type as AccountTypeEnum);
      if (isAsset) {
        totalAssets += balance;
      } else {
        totalLiabilities += balance;
      }
    });

    return {
      assets: totalAssets,
      liabilities: totalLiabilities,
      netWorth: totalAssets - totalLiabilities,
    };
  }, [accounts, accountDetails]);

  const formatCurrency = (val: number) => {
    return Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: "GBP",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <>
      {/* Title & Actions */}
      <FLPBox
        alignItems="center"
        display="flex"
        flexDirection="row"
        justifyContent="space-between"
        my={5}
      >
        <FLPHeading as="h1" color="blue.500" size="xl">
          {t("accounts")}
        </FLPHeading>
        <AddEditAccountsDialogBtn />
      </FLPBox>

      {/* Summary Stats Header */}
      {accounts.length > 0 && (
        <Grid gap={6} mb={8} templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}>
          {/* Net Worth Card */}
          <Box
            bg={{ base: "blue.50", _dark: "gray.900" }}
            border="1px solid"
            borderColor={{ base: "blue.105", _dark: "blue.900" }}
            borderRadius="xl"
            boxShadow="sm"
            padding={5}
          >
            <FLPText color="gray.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
              Net Worth
            </FLPText>
            <FLPHeading
              as="h2"
              color={stats.netWorth >= 0 ? "emerald.500" : "red.500"}
              mt={1}
              size="2xl"
            >
              {formatCurrency(stats.netWorth)}
            </FLPHeading>
          </Box>

          {/* Assets Card */}
          <Box
            bg={{ base: "white", _dark: "gray.900" }}
            border="1px solid"
            borderColor={{ base: "gray.200", _dark: "gray.850" }}
            borderRadius="xl"
            boxShadow="sm"
            padding={5}
          >
            <FLPText color="gray.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
              Total Assets
            </FLPText>
            <FLPHeading as="h2" color="green.500" mt={1} size="xl">
              {formatCurrency(stats.assets)}
            </FLPHeading>
          </Box>

          {/* Liabilities Card */}
          <Box
            bg={{ base: "white", _dark: "gray.900" }}
            border="1px solid"
            borderColor={{ base: "gray.200", _dark: "gray.855" }}
            borderRadius="xl"
            boxShadow="sm"
            padding={5}
          >
            <FLPText color="gray.500" fontSize="xs" fontWeight="semibold" textTransform="uppercase">
              Total Liabilities
            </FLPText>
            <FLPHeading as="h2" color="red.500" mt={1} size="xl">
              {formatCurrency(stats.liabilities)}
            </FLPHeading>
          </Box>
        </Grid>
      )}

      {/* Account Categories */}
      <FLPBox display="flex" flexDirection="column" gap={10}>
        {accountTypeArr.map((accountType) => {
          return (
            isAccountTypeValid(accountType, accounts) && (
              <Fragment key={accountType}>
                <FLPBox
                  borderBottom="1px solid"
                  borderColor={{ base: "gray.100", _dark: "gray.800" }}
                  pb={6}
                >
                  <FLPHeading as="h2" color="gray.600" mb={4} size="lg">
                    {accountType}
                  </FLPHeading>
                  <FLPBox display="flex" flexWrap="wrap" gap={5}>
                    {accounts.map(
                      ({ name, id, type }) =>
                        type === accountType && (
                          <AccountsCard
                            key={id}
                            accountId={id}
                            name={name}
                            type={type as AccountTypeEnum}
                          />
                        ),
                    )}
                  </FLPBox>
                </FLPBox>
              </Fragment>
            )
          );
        })}
      </FLPBox>
    </>
  );
};

export default AccountsContainer;
