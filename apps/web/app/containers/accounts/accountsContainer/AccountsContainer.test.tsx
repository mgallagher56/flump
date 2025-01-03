import type { ReactNode } from 'react';

import { fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import customRender from '~/testUtils/customRender';

import mockAccounts from '__mocks__/accounts';

import AccountsContainer from './AccountsContainer';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() }))
}));

vi.mock('react-router', async () => {
  const actual: Record<string, unknown> = await vi.importActual('react-router');
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: mocks.mockUseRevalidator,
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    useSubmit: () => ({ onSubmit: vi.fn() })
  };
});

vi.mock('app/components/core/cards/AccountsCard', () => ({ default: () => 'AccountsCard' }));
vi.mock('app/components/core/input/FLPInput', () => ({ default: () => 'FLPInput' }));

describe('<AccountsContainer />', () => {
  test('should render as expected when no accounts exist', () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: [] });
    const { container } = customRender(<AccountsContainer />);
    expect(container).toMatchSnapshot();
  });
 
  test('should render as expected when accounts exist', () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: mockAccounts });
    const { container } = customRender(<AccountsContainer />);
    expect(container).toMatchSnapshot();
  });

  test('should call supabase functions to add an account', async () => {
    const { getAllByText } = customRender(<AccountsContainer />);
    const addAccountModalBtn = getAllByText('addAccount')[0];
    expect(addAccountModalBtn).toBeDefined();
    fireEvent.click(addAccountModalBtn);
    await waitFor(() => {
      expect(getAllByText('addAccount')[0]).toBeDefined();
    });
  });
});
