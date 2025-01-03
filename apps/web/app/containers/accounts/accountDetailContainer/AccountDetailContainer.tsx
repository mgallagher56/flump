import { type FC, useCallback, useMemo, useState } from 'react';

import { Stack } from '@chakra-ui/react/stack';
import { useTranslation } from 'react-i18next';
import { useLoaderData, useRevalidator } from 'react-router';
import AccountDetails from '~/components/accounts/AccountDetails';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPHeading from '~/components/core/typography/FLPHeading';
import type { loader } from '~/routes/app.accounts.$account';
import supabase from '~/utils/supabase';
import { currentYear, emptyObject } from '~/utils/utils';

const AccountDetailContainer: FC = () => {
  const { t } = useTranslation();
  const { revalidate } = useRevalidator();
  const { account, accountDetails } = useLoaderData<typeof loader>();
  const [isLoading, setIsLoading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedValues, setEditedValues] = useState<{ [key: string]: { [key: string]: string } }>(emptyObject);

  const availableYears = useMemo(() => accountDetails?.map(({ year }: { year?: number }) => year), [accountDetails]);

  const handleToggleEditMode = useCallback(() => setIsEditMode((prev) => !prev), []);
  const handleInputChange = useCallback(
    (event: {
      target: {
        dataset: DOMStringMap;
        value: string;
      };
    }) => {
      setEditedValues((prev) => ({
        ...prev,
        [event.target.dataset.year]: {
          ...(prev?.[event.target.dataset.year] ?? emptyObject),
          [event.target.dataset.month]: event.target.value
        }
      }));
    },
    []
  );

  const handleAddNewYear = useCallback(
    async (selectedYear: number, yearToAdd: 'current' | 'prev' | 'next') => {
      setIsLoading(true);
      const nextYear = selectedYear + (yearToAdd === 'prev' ? -1 : 1);
      const yearWithMonths = Array.from({ length: 12 }, (_, i) => i + 1).map((value) => ({
        account_id: account.id,
        month: value,
        year: yearToAdd === 'current' ? currentYear : nextYear,
        value: 0
      }));

      await supabase.from('account_details').insert(yearWithMonths);
      revalidate();
      setIsLoading(false);
    },
    [account.id, revalidate]
  );

  const handleSaveValues = useCallback(
    (event: { preventDefault: () => void }) => {
      setIsLoading(true);
      event.preventDefault();
      const updatedValues = Object.entries(editedValues)
        .map(([year, values]) =>
          Object.entries(values).map(([month, value]) => ({
            account_id: account.id,
            month: parseInt(month),
            year: parseInt(year),
            value: parseInt(value)
          }))
        )
        .flat();

      updatedValues.forEach(async (value) => {
        await supabase
          .from('account_details')
          .update(value)
          .eq('account_id', account.id)
          .eq('month', value.month)
          .eq('year', value.year);
      });

      handleToggleEditMode();
      setEditedValues(emptyObject);
      revalidate();
      setIsLoading(false);
    },
    [account.id, editedValues, handleToggleEditMode, revalidate]
  );

  return (
    <Stack flexDirection="column" gap={10}>
      <Stack alignItems="center" flexDirection="row" justifyContent="space-between">
        <Stack flexDirection="column">
          <FLPHeading as="h2" size="sm">
            {account.type}
          </FLPHeading>
          <FLPHeading as="h1" size="xl">
            {account.name}
          </FLPHeading>
        </Stack>
        <Stack>
          <FLPButton
            disabled={isLoading}
            isLoading={isLoading}
            variant="outline"
            onClick={isEditMode ? handleSaveValues : handleToggleEditMode}
          >
            {isEditMode ? t('save') : t('edit')}
          </FLPButton>
        </Stack>
      </Stack>
      <AccountDetails editedValues={editedValues} isEditMode={isEditMode} onInputChange={handleInputChange} />

      <Stack flexDirection="row">
        {availableYears?.length ? (
          <>
            <FLPButton
              colorScheme="green"
              disabled={isLoading}
              isLoading={isLoading}
              size="sm"
              variant="outline"
              onClick={() => handleAddNewYear(availableYears?.[availableYears.length - 1], 'prev')}
            >
              {t('addPrevYear')}
            </FLPButton>
            <FLPButton
              colorScheme="green"
              disabled={isLoading}
              isLoading={isLoading}
              size="sm"
              variant="outline"
              onClick={() => handleAddNewYear(availableYears?.[0], 'next')}
            >
              {t('addNextYear')}
            </FLPButton>
          </>
        ) : (
          <FLPButton
            colorScheme="green"
            disabled={isLoading}
            isLoading={isLoading}
            size="sm"
            variant="outline"
            onClick={() => handleAddNewYear(new Date().getFullYear(), 'current')}
          >
            {t('addCurrentYear')}
          </FLPButton>
        )}
      </Stack>
    </Stack>
  );
};

export default AccountDetailContainer;
