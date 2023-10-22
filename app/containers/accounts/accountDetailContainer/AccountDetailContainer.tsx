import { type FC, useCallback, useMemo, useState } from 'react';

import { Stack, StackItem } from '@chakra-ui/react';
import { useLoaderData, useRevalidator } from '@remix-run/react';
import { useTranslation } from 'react-i18next';
import AccountDetails from '~/components/accounts/AccountDetails';
import FLPButton from '~/components/core/buttons/FLPButton';
import FLPHeading from '~/components/core/typography/FLPHeading';
import type { loader } from '~/routes/app.accounts.$account';
import supabase from '~/utils/supabase';
import { emptyObject } from '~/utils/utils';

const AccountDetailContainer: FC = () => {
  const { t } = useTranslation();
  const { revalidate } = useRevalidator();
  const { account, accountDetails } = useLoaderData<typeof loader>();
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedValues, setEditedValues] = useState<{ [key: string]: { [key: string]: string } }>(emptyObject);

  const availableYears = useMemo(() => accountDetails?.map(({ year }: { year?: number }) => year), [accountDetails]);

  const handleToggleEditMode = useCallback(() => setIsEditMode((prev) => !prev), []);
  const handleInputChange = useCallback(
    (event: {
      target: {
        dataset: {
          year: string;
          month: string;
        };
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
    async (selectedYear: number, prevNext: 'prev' | 'next') => {
      const nextYear = selectedYear + (prevNext === 'prev' ? -1 : 1);
      const yearWithMonths = Array.from({ length: 12 }, (_, i) => i + 1).map((value) => ({
        account_id: account.id,
        month: value,
        year: nextYear,
        value: 0
      }));

      await supabase.from('account_details').insert(yearWithMonths);
      revalidate();
    },
    [account.id, revalidate]
  );

  const handleSaveValues = useCallback(
    (event: { preventDefault: () => void }) => {
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
    },
    [account.id, editedValues, handleToggleEditMode, revalidate]
  );

  return (
    <Stack flexDirection="column" gap={10}>
      <Stack flexDirection="row" alignItems="center" justifyContent="space-between">
        <StackItem flexDirection="column">
          <FLPHeading as="h2" size="sm">
            {account.type}
          </FLPHeading>
          <FLPHeading as="h1" size="xl">
            {account.name}
          </FLPHeading>
        </StackItem>
        <StackItem>
          <FLPButton variant="outline" onClick={isEditMode ? handleSaveValues : handleToggleEditMode}>
            {isEditMode ? t('save') : t('edit')}
          </FLPButton>
        </StackItem>
      </Stack>
      <AccountDetails onInputChange={handleInputChange} editedValues={editedValues} isEditMode={isEditMode} />

      <Stack flexDirection="row">
        <FLPButton onClick={() => handleAddNewYear(availableYears?.[availableYears.length - 1], 'prev')}>
          {t('addPrevYear')}
        </FLPButton>
        <FLPButton onClick={() => handleAddNewYear(availableYears?.[0], 'next')}>{t('addNextYear')}</FLPButton>
      </Stack>
    </Stack>
  );
};

export default AccountDetailContainer;
