import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';
import { AccountTypeEnum } from '~/containers/accounts/utils';

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

vi.mock('@remix-run/react', async () => {
  const actual: Record<string, unknown> = await vi.importActual('@remix-run/react');
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

describe('<AccountsCard />', () => {
  mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });

  test('it renders an AccountsCard component with title as expected', () => {
    const { baseElement } = render(
      <AccountsCard accountId={'123456'} name="My curent account" type={AccountTypeEnum.CURRENT} />
    );
    expect(baseElement).toMatchSnapshot();
  });
  test('it calls supabase.delete when delete button is clicked', () => {
    const { getByText } = render(
      <AccountsCard accountId={'123456'} name="My curent account" type={AccountTypeEnum.CURRENT} />
    );
    const deleteButton = getByText('remove');
    fireEvent.click(deleteButton);
    expect(mocks.mockFrom).toBeCalledWith('accounts');
  });
});
