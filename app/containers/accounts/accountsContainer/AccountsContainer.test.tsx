import type { ReactNode } from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import mockAccounts from '__mocks__/accounts';

import AccountsContainer from './AccountsContainer';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({revalidate: vi.fn()})),
}));

vi.mock('@remix-run/react', async () => {
  const actual: Record<string, unknown> = await vi.importActual('@remix-run/react');
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
  it('should render as expected when no accounts exist', () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: [] });
    const { container } = render(<AccountsContainer />);
    expect(container).toMatchSnapshot();
  });

  it('should render as expected when accounts exist', () => {
    mocks.mockUseLoaderData.mockReturnValue({ accounts: mockAccounts });
    const { container } = render(<AccountsContainer />);
    expect(container).toMatchSnapshot();
  });

  it('should call supabase functions to add an account', async () => {
    const { getAllByText } = render(<AccountsContainer />);
    const addAccountModalBtn = getAllByText('addAccount')[0];
    expect(addAccountModalBtn).toBeDefined();
    fireEvent.click(addAccountModalBtn);
    await waitFor(() => {
      expect(getAllByText('addAccount')[0]).toBeDefined();
    });
  });
});
