import type { ReactElement } from 'react';

import type { TFunction } from 'i18next';
import FLPBox from '~/components/core/structure/FLPBox';
import type { TabData } from '~/components/core/tabs/types';
import FLPHeading from '~/components/core/typography/FLPHeading';
import type { Employee } from '~/routes/_index';

import { FallbackEnums } from './utils';

const { NA } = FallbackEnums;

export const getTabsData = (employees: Partial<Employee>[], t: TFunction): TabData[] => [
  {
    label: t('featureNum', { num: 1 }),
    value: 'feature-1',
    content: (
      <main>
        <FLPBox>
          <FLPHeading as="h1">{t('featureNum', { num: 1 })}</FLPHeading>
          {employees.map(
            (employee, index): ReactElement => (
              <FLPBox style={{ display: 'flex', gap: '.5rem' }} key={employee.id ?? index}>
                <h3>{`${employee.name ?? NA} - ${employee.department ?? NA}`}</h3>
              </FLPBox>
            )
          )}
        </FLPBox>
      </main>
    )
  },
  {
    label: t('featureNum', { num: 2 }),
    value: 'feature 2',
    content: (
      <main>
        <FLPBox>
          <FLPHeading as="h1">{t('featureNum', { num: 2 })}</FLPHeading>
        </FLPBox>
      </main>
    )
  },
  {
    label: t('featureNum', { num: 3 }),
    value: 'feature-3',
    content: (
      <main>
        <FLPBox>
          <FLPHeading as="h1">{t('featureNum', { num: 3 })}</FLPHeading>
        </FLPBox>
      </main>
    )
  }
];
