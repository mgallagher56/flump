import { render } from '@testing-library/react';
import { vi } from 'vitest';

import FLPSelect from './FLPSelect';

describe('<FLPSelect />', () => {
  test('should render as expected', () => {
    const { baseElement } = render(
      <FLPSelect label="label" value={1} onChange={vi.fn()}>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </FLPSelect>
    );
    expect(baseElement).toMatchSnapshot();
  });
  test('should render as expected as row', () => {
    const { baseElement } = render(
      <FLPSelect flexDirection="row" label="label" value={1} onChange={vi.fn()}>
        <option value="1">1</option>
        <option value="2">2</option>
        <option value="3">3</option>
      </FLPSelect>
    );
    expect(baseElement).toMatchSnapshot();
  });
});
