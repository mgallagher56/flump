import type { ReactNode } from 'react';

import { vi } from 'vitest';
import customRender from '~/testUtils/customRender';

import mockUser from '__mocks__/user';

import AddEditAccountsDialogBtn from './AddEditAccountsDialog';
import { cleanup } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  mockUseLoaderData: vi.fn(),
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
  update: vi.fn(() => ({
    eq: () => ({
      eq: () => ({})
    })
  })),
  delete: vi.fn(() => ({
    eq: () => ({
      eq: () => ({})
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
    from: () => ({
      update: mocks.update,
      delete: mocks.delete
    })
  }
}));

describe('<EditAccountDialogBtn', () => {
  beforeAll(() => {
    cleanup();
  });
  test('should render edit account dialog when trigger button is clicked', async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement, getByText, getAllByText, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />
    );

    const triggerBtn = getByText('edit');
    expect(triggerBtn).toBeDefined();
    await user.click(triggerBtn);

    const addAccountBtn = getAllByText('save')[0];
    await user.click(addAccountBtn);
    expect(mocks.update).toBeCalled();

    const htmlString = baseElement.outerHTML.toString();
    const baseElementConstant = htmlString.replaceAll(/style="[^"]*"/g, '');
    expect(baseElementConstant).toMatchSnapshot();
  });

  test('should render edit account dialog and call supabase.delete when delete button is clicked', async () => {
    mocks.mockUseLoaderData.mockReturnValue({ user: mockUser });
    const { baseElement, getByText, user } = customRender(
      <AddEditAccountsDialogBtn isEditAccount accountId="123456" />
    );

    const triggerBtn = getByText('edit');
    expect(triggerBtn).toBeDefined();
    await user.click(triggerBtn);

    expect(baseElement).toMatchSnapshot();

    const deleteBtn = getByText('delete');
    expect(deleteBtn).toBeDefined();
    await user.click(deleteBtn);

    expect(mocks.delete).toBeCalled();
  });
});
