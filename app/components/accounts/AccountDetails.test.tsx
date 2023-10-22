import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { emptyObject } from '~/utils/utils';

import AccountDetails from './AccountDetails';

const mockAccountDetails = [
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
];

vi.mock('@remix-run/react', async () => {
  const actual: Record<string, unknown> = await vi.importActual('@remix-run/react');
  return {
    ...actual,
    useLoaderData: () => ({ accountDetails: mockAccountDetails })
  };
});
describe('<AccountDetails />', () => {
  it('should render', () => {
    const { container } = render(
      <AccountDetails onInputChange={vi.fn()} isEditMode={false} editedValues={emptyObject} />
    );
    expect(container).toMatchSnapshot();
  });

  it('should render in edit mode', () => {
    const { container } = render(
      <AccountDetails
        onInputChange={vi.fn()}
        isEditMode={true}
        editedValues={{
          2023: {
            1: '1000'
          }
        }}
      />
    );
    expect(container).toMatchSnapshot();
  });
});
