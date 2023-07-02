import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import FLPButton from './FLPButton';
import FLPButtonGroup from './FLPButtonGroup';

describe('FLPButtonGroup', () => {
  test('renders as expected', () => {
    const { container, getByText } = render(
      <FLPButtonGroup>
        <FLPButton>Button 1</FLPButton>
        <FLPButton>Button 2</FLPButton>
      </FLPButtonGroup>
    );
    expect(container).toMatchSnapshot();
    expect(getByText('Button 1')).toBeDefined();
    expect(getByText('Button 2')).toBeDefined();
  });
});
