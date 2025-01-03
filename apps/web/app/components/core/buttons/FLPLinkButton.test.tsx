import { render } from '@testing-library/react';

import FLPLinkButton from './FLPLinkButton';

describe('FLPLinkButton', () => {
  test('renders as expected', () => {
    const { container, getByText } = render(<FLPLinkButton text={'Button'} to="/test" />);
    expect(container).toMatchSnapshot();
    expect(getByText('Button')).toBeDefined();
  });
  test('renders as expected with a custom class', () => {
    const { container, getByText } = render(<FLPLinkButton className="test-class" text={'Button'} to="/test" />);
    expect(container).toMatchSnapshot();
    expect(getByText('Button')).toBeDefined();
  });

  test('renders as expected with a colorPalette', () => {
    const { container, getByText } = render(<FLPLinkButton colorPalette="red" text={'Button'} to="/test" />);
    expect(container).toMatchSnapshot();
    expect(getByText('Button')).toBeDefined();
  });
});
