import { renderHook } from '@testing-library/react';
import { useTranslation } from 'react-i18next';

import { getTabsData } from './utils';

describe('getTabsData', () => {
  const { t } = renderHook(() => useTranslation()).result.current;
  const employees = [
    {
      department: 'IT'
    },
    {
      id: 2,
      name: 'Jane Doe'
    }
  ];
  const result = getTabsData(employees, t);
  test('should return an array of objects', () => {
    expect(result).toEqual([
      {
        label: 'featureNum',
        value: 'feature-1',
        children: expect.any(Object)
      },
      {
        label: 'featureNum',
        value: 'feature 2',
        children: expect.any(Object)
      },
      {
        label: 'featureNum',
        value: 'feature-3',
        children: expect.any(Object)
      }
    ]);
  });
  test.each(result)('should have a label, value, and children', (tab) => {
    expect(tab.children).toMatchSnapshot();
  });
});
