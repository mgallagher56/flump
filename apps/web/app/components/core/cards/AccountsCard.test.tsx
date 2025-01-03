import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';
import { AccountTypeEnum } from '~/containers/accounts/utils';
import { currentMonth, currentYear } from '~/utils/utils';

import mockUser from '__mocks__/user';

import AccountsCard from './AccountsCard';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
  mockUseNavigate: () => vi.fn(),
  mockFrom: vi.fn(() => ({
    delete: () => ({
      eq: () => ({
        eq: () => ({})
      })
    })
  }))
}));

vi.mock('react-router', async () => {
  const actual: Record<string, unknown> = await vi.importActual('react-router');
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: mocks.mockUseRevalidator,
    useNavigate: mocks.mockUseNavigate
  };
});

vi.mock('app/utils/supabase', () => ({
  default: {
    from: mocks.mockFrom
  }
}));

vi.mock('app/utils/utils', () => ({
  currentMonth: 12,
  currentYear: 2023
}));

const getAdjustedValue = (index: number) => {
  if (currentMonth - 1 === index) return `${index - 2}000`;
  if (currentMonth - 3 === index) return `${index + 5}000`;

  return `${index}000`;
};

describe('<AccountsCard />', () => {
  test('it renders an AccountsCard component with title as expected', () => {
    mocks.mockUseLoaderData.mockReturnValue({
      user: mockUser,
      accountDetails: Array.from({ length: 12 }, (_, i) => {
        return {
          id: i,
          account_id: '123456',
          month: i + 1,
          year: currentYear,
          value: parseInt(`${i + 1}000}`)
        };
      })
    });

    const { baseElement } = render(
      <AccountsCard accountId={'123456'} name="My curent account" type={AccountTypeEnum.CURRENT} />
    );
    expect(baseElement).toMatchSnapshot();
  });
});

describe('<AccountsCard with increasing values', () => {
  test('it calls supabase.delete when delete button is clicked', () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      user: mockUser,
      accountDetails: Array.from({ length: 13 }, (_, i) => {
        return {
          id: i,
          account_id: '123456',
          month: i + 1,
          year: currentYear,
          value: parseInt(getAdjustedValue(i))
        };
      })
    });

    const { baseElement, getByText } = render(
      <AccountsCard accountId={'123456'} name="My curent account" type={AccountTypeEnum.CURRENT} />
    );
    const deleteButton = getByText('delete');
    fireEvent.click(deleteButton);
    expect(mocks.mockFrom).toBeCalledWith('accounts');
    expect(baseElement).toMatchSnapshot();
  });
});
