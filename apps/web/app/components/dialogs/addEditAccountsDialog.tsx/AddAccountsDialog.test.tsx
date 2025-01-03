import type { ReactNode } from 'react';

import { vi } from 'vitest';
import customRender from '~/testUtils/customRender';

import mockUser from '__mocks__/user';

import AddEditAccountsDialogBtn from './AddEditAccountsDialog';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
  mockFrom: vi.fn(() => ({
    insert: () => ({
      eq: () => ({
        eq: () => ({})
      }),
      select: vi.fn(() => ({
        data: [{ id: '123456' }]
      }))
    })
  }))
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

vi.mock('app/utils/supabase', () => ({
  default: {
    from: mocks.mockFrom
  }
}));

describe('<AddAccountDialogBtn', () => {
  test('should render add account dialog when trigger button is clicked', async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement, getByText, getAllByText, user } = customRender(
      <AddEditAccountsDialogBtn accountId="123456" />
    );
    const triggerBtn = getByText('addAccount');
    expect(triggerBtn).toBeDefined();
    await user.click(triggerBtn);

    const nameInput = getByText('Name');
    expect(nameInput).toBeDefined();
    const accountTypeInput = getByText('Account Type');
    expect(accountTypeInput).toBeDefined();

    await user.type(nameInput, 'Starling');

    await user.type(accountTypeInput, 'Saving');

    const addAccountBtn = getAllByText('addAccount')[2];
    expect(addAccountBtn).toBeDefined();
    await user.click(addAccountBtn);
    expect(mocks.mockFrom).toBeCalled();
    const htmlString = baseElement.outerHTML.toString();
    const baseElementConstant = htmlString.replaceAll(/style="[^"]*"/g, '');
    expect(baseElementConstant).toMatchSnapshot();
  });
});
