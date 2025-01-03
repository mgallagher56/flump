import { createListCollection } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import { vi } from 'vitest';

import FLPSelect from './FLPSelect';

const mockSelectioOptions = createListCollection({
  items: ['1', '2', '3'].map((item) => ({ id: item, name: item })),
  itemToString: (item) => item.name,
  itemToValue: (item) => item.id
});

describe('<FLPSelect />', () => {
  test('should render as expected', () => {
    const { baseElement } = render(
      <FLPSelect collection={mockSelectioOptions} label="label" value={['1']} onChange={vi.fn()} />
    );
    expect(baseElement).toMatchSnapshot();
  });
  test('should render as expected as row', () => {
    const { baseElement } = render(
      <FLPSelect collection={mockSelectioOptions} flexDirection="row" label="label" value={['1']} onChange={vi.fn()} />
    );
    expect(baseElement).toMatchSnapshot();
  });
});
