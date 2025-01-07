import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import { AccountTypeEnum } from '~/containers/accounts/utils';
import { currentMonth, currentYear } from '~/utils/utils';

import mockUser from '__mocks__/user';

import AccountsCard from './AccountsCard';
import customRender from '~/testUtils/customRender';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
  mockUseNavigate: () => vi.fn(),
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

vi.mock('app/utils/utils', () => ({
  currentMonth: 12,
  currentYear: 2023
}));

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

    const { baseElement } =customRender(
      <AccountsCard accountId={'123456'} name="My curent account" type={AccountTypeEnum.CURRENT} />
    );
    expect(baseElement).toMatchSnapshot();
  });
});
