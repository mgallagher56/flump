import { test } from 'vitest';
import customRender from '~/testUtils/customRender';

import FLPButton from './FLPButton';
import FLPButtonGroup from './FLPButtonGroup';

describe('FLPButtonGroup', () => {
  test('renders as expected', () => {
    const { container, getByText } = customRender(
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
