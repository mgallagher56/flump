import type { ReactNode } from 'react';

import { fireEvent, render, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import mockUser from '__mocks__/user';

import AddEditAccountsDialogBtn from './AddEditAccountsDialog';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockFrom: vi.fn(() => ({
    update: () => ({
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
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    useSubmit: () => ({ onSubmit: vi.fn() })
  };
});

vi.mock('app/utils/supabase', () => ({
  default: {
    from: mocks.mockFrom
  }
}));

describe('<EditAccountDialogBtn', () => {
  mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
  const { baseElement, getByText, getAllByText } = render(
    <AddEditAccountsDialogBtn accountId="123456" isEditAccount />
  );
  const triggerBtn = getByText('edit');
  expect(triggerBtn).toBeDefined();
  fireEvent.click(triggerBtn);
  test('should render edit account dialog when trigger button is clicked', async () => {
    await waitFor(() => {
      const addAccountBtn = getAllByText('save')[0];
      fireEvent.click(addAccountBtn);
      expect(mocks.mockFrom).toBeCalled();
    });
    expect(baseElement).toMatchSnapshot();
  });
});
