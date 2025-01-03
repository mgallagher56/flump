import { Fragment, useCallback } from 'react';
import type { ChangeEvent, FC } from 'react';

import { Stack } from '@chakra-ui/react';
import { useTranslation } from 'react-i18next';
import { useLoaderData, useRevalidator } from 'react-router';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPInput from '~/components/core/inputs/input/FLPInput';
import FLPHeading from '~/components/core/typography/FLPHeading';
import FLPText from '~/components/core/typography/FLPText';
import type { loader } from '~/routes/app.accounts.$account';
import supabase from '~/utils/supabase';

import { accountDetailDisplayStyles } from './AccountDetailsStyles';

interface AccountDetailsProps {
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  editedValues: { [key: string]: { [key: string]: string } };
  isEditMode: boolean;
}

const AccountDetails: FC<AccountDetailsProps> = ({ onInputChange, editedValues, isEditMode }) => {
  const { t } = useTranslation();
  const { account, accountDetails } = useLoaderData<typeof loader>();
  const { revalidate } = useRevalidator();

  const onRemoveYear = useCallback(
    async (year: number) => {
      await supabase.from('account_details').delete().eq('account_id', account.id).eq('year', year).select();
      revalidate();
    },
    [account.id, revalidate]
  );

  return (
    <Stack flexDirection="column" gap={5} overflow="auto">
      {accountDetails
        .map(({ year }: { year?: number }) => year)
        .filter(
          (
            value: number,
            index: number,
            self: {
              indexOf: (arg0: number) => number;
            }
          ) => self.indexOf(value) === index
        )
        .map((year: number) => (
          <Fragment key={year}>
            <Stack alignItems="center" flexDirection="row">
              <FLPHeading as="h3" size="lg">
                {year}
              </FLPHeading>
              <FLPButton colorScheme="red" size="xs" variant="outline" onClick={() => onRemoveYear(year)}>
                {t('deleteYear')}
              </FLPButton>
            </Stack>
            <div className={accountDetailDisplayStyles}>
              {accountDetails.map(
                ({ month, year: currentYear, value }: { month?: number; year?: number; value?: number }) => {
                  if (year !== currentYear) return null;
                  const monthName = new Date(0, month - 1).toLocaleString('default', { month: 'long' });
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
                          width={100}
                          onChange={onInputChange}
                        />
                      ) : (
                        <FLPText>
                          {Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP' })
                            .format(value)
                            .slice(0, -3)}
                        </FLPText>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          </Fragment>
        ))}
    </Stack>
  );
};

export default AccountDetails;
