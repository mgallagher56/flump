import { act, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import customRender from '~/testUtils/customRender';

import AccountDetailContainer from './AccountDetailContainer';

const mocks = vi.hoisted(() => ({
  mockUseRevalidator: vi.fn(() => ({ revalidate: vi.fn() })),
  mockFrom: vi.fn(() => ({
    insert: vi.fn(),
    update: vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: vi.fn(() => ({
          eq: vi.fn()
        }))
      }))
    }))
  })),
  mockUseLoaderData: vi.fn(() => ({
    account: {
      id: '123456',
      name: 'My current account',
      type: 'CURRENT',
      balance: 1000
    },
    accountDetails: [
      {
        month: 1,
        year: 2021,
        value: 1000
      },
      {
        month: 2,
        year: 2021,
        value: 1000
      },
      {
        month: 3,
        year: 2021,
        value: 1000
      },
      {
        month: 4,
        year: 2021,
        value: 1000
      },
      {
        month: 5,
        year: 2021,
        value: 1000
      },
      {
        month: 6,
        year: 2021,
        value: 1000
      },
      {
        month: 7,
        year: 2021,
        value: 1000
      },
      {
        month: 8,
        year: 2021,
        value: 1000
      },
      {
        month: 9,
        year: 2021,
        value: 1000
      },
      {
        month: 10,
        year: 2021,
        value: 1000
      },
      {
        month: 11,
        year: 2021,
        value: 1000
      },
      {
        month: 12,
        year: 2021,
        value: 1000
      },
      {
        month: 1,
        year: 2023,
        value: 1000
      },
      {
        month: 2,
        year: 2023,
        value: 1000
      },
      {
        month: 3,
        year: 2023,
        value: 1000
      },
      {
        month: 4,
        year: 2023,
        value: 1000
      },
      {
        month: 5,
        year: 2023,
        value: 1000
      },
      {
        month: 6,
        year: 2023,
        value: 1000
      },
      {
        month: 7,
        year: 2023,
        value: 1000
      },
      {
        month: 8,
        year: 2023,
        value: 1000
      },
      {
        month: 9,
        year: 2023,
        value: 1000
      },
      {
        month: 10,
        year: 2023,
        value: 1000
      },
      {
        month: 11,
        year: 2023,
        value: 1000
      },
      {
        month: 12,
        year: 2023,
        value: 1000
      }
    ]
  }))
}));

vi.mock('react-router', async () => {
  const actual: Record<string, unknown> = await vi.importActual('react-router');
  return {
    ...actual,
    useLoaderData: mocks.mockUseLoaderData,
    useRevalidator: mocks.mockUseRevalidator
  };
});

vi.mock('app/utils/supabase', () => ({
  default: {
    from: mocks.mockFrom,
    update: mocks.mockFrom
  }
}));

describe('<AccountDetailContainer />', () => {
  test('should render', () => {
    const { baseElement } = customRender(<AccountDetailContainer />);
    expect(baseElement).toMatchSnapshot();
  });
  test('should add new years when buttons are clicked', () => {
    const { baseElement, getByText } = customRender(<AccountDetailContainer />);

    const addNextYearButton = getByText('addNextYear');
    const addPrevYearButton = getByText('addPrevYear');
    act(() => {
      fireEvent.click(addNextYearButton);
      fireEvent.click(addPrevYearButton);
    });

    expect(mocks.mockFrom).toHaveBeenCalledTimes(2);
    expect(baseElement).toMatchSnapshot('with new years added');
  });

  test('should toggle edit mode when button is clicked, changed value and save new value', () => {
    const { baseElement, getByText, getAllByDisplayValue } = customRender(<AccountDetailContainer />);
    const editButton = getByText('edit');
    act(() => {
      fireEvent.click(editButton);
    });
    expect(baseElement).toMatchSnapshot('with edit mode enabled');

    const firstInput = getAllByDisplayValue('1000')[0];
    act(() => {
      fireEvent.change(firstInput, { target: { value: '2000' } });
    });

    const saveButton = getByText('save');
    act(() => {
      fireEvent.click(saveButton);
    });

    expect(mocks.mockFrom).toHaveBeenCalledWith('account_details');
    expect(mocks.mockFrom).toHaveBeenCalledTimes(1);
  });

  test('should render add current year button and add current year when clicked', () => {
    mocks.mockUseLoaderData.mockReturnValueOnce({
      account: {
        id: '123456',
        name: 'My current account',
        type: 'CURRENT',
        balance: 1000
      },
      accountDetails: []
    });

    const { baseElement, getByText } = customRender(<AccountDetailContainer />);
    const addCurrentYearButton = getByText('addCurrentYear');
    act(() => {
      fireEvent.click(addCurrentYearButton);
    });
    expect(mocks.mockFrom).toHaveBeenCalledTimes(1);
    expect(baseElement).toMatchSnapshot('with current year added');
  });
});
