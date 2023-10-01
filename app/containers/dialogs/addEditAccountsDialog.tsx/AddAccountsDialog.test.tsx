import type { ReactNode } from 'react';

import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';

import mockUser from '__mocks__/user';

import AddEditAccountsDialogBtn from './AddEditAccountsDialog';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({revalidate: vi.fn()})),
  mockFrom: vi.fn(() => ({
    insert: () => ({
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
    Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
    useSubmit: () => ({ onSubmit: vi.fn() })
  };
});

vi.mock('app/utils/supabase', () => ({
  default: {
    from: mocks.mockFrom
  }
}));

describe('<AddAccountDialogBtn', () => {
  mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
  const { baseElement, getByText, getAllByText, getByLabelText } = render(
    <AddEditAccountsDialogBtn accountId="123456" />
  );
  const triggerBtn = getByText('addAccount');
  expect(triggerBtn).toBeDefined();
  fireEvent.click(triggerBtn);
  test('should render add account dialog when trigger button is clicked', () => {
    const nameInput = getByLabelText('Name');
    const accountTypeInput = getByLabelText('Account Type');
    fireEvent.change(nameInput, {
      target: {
        value: 'Starling'
      }
    });
    fireEvent.input(accountTypeInput, {
      target: {
        value: 'Current'
      }
    });
    const addAccountBtn = getAllByText('addAccount')[2];
    expect(addAccountBtn).toBeDefined();
    fireEvent.click(addAccountBtn);
    expect(mocks.mockFrom).toBeCalled();
    const htmlString = baseElement.outerHTML.toString();
    const baseElementConstant = htmlString.replaceAll(/style="[^"]*"/g, '');
    expect(baseElementConstant).toMatchSnapshot();
  });
});
