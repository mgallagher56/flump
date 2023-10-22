import { Fragment } from 'react';
import type { ChangeEvent, FC } from 'react';

import { Stack } from '@chakra-ui/react';
import { useLoaderData } from '@remix-run/react';
import type { loader } from '~/routes/app.accounts.$account';

import FLPInput from '../core/inputs/input/FLPInput';
import FLPHeading from '../core/typography/FLPHeading';
import FLPText from '../core/typography/FLPText';
import { accountDetailDisplayStyles } from './AccountDetailsStyles';

interface AccountDetailsProps {
  onInputChange: (event: ChangeEvent<HTMLInputElement>) => void;
  editedValues: { [key: string]: { [key: string]: string } };
  isEditMode: boolean;
}

const AccountDetails: FC<AccountDetailsProps> = ({ onInputChange, editedValues, isEditMode }) => {
  const { accountDetails } = useLoaderData<typeof loader>();

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
            <FLPHeading as="h3" size="lg">
              {year}
            </FLPHeading>
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
                          data-month={month}
                          data-year={year}
                          isLabelHidden
                          label={`${year}-${monthName}`}
                          name="amount"
                          onChange={onInputChange}
                          placeholder="0.00"
                          type="number"
                          value={editedValues?.[year]?.[month] ?? value}
                          width={100}
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
