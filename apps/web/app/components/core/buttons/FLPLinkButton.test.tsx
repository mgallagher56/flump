import customRender from '~/testUtils/customRender';

import FLPLinkButton from './FLPLinkButton';

describe('FLPLinkButton', () => {
  test('renders as expected', () => {
    const { container, getByText } =customRender(<FLPLinkButton text={'Button'} to="/test" />);
    expect(container).toMatchSnapshot();
    expect(getByText('Button')).toBeDefined();
  });
  test('renders as expected with a custom class', () => {
    const { container, getByText } =customRender(<FLPLinkButton className="test-class" text={'Button'} to="/test" />);
    expect(container).toMatchSnapshot();
    expect(getByText('Button')).toBeDefined();
  });

  test('renders as expected with a colorPalette', () => {
    const { container, getByText } =customRender(<FLPLinkButton colorPalette="red" text={'Button'} to="/test" />);
    expect(container).toMatchSnapshot();
    expect(getByText('Button')).toBeDefined();
  });
});
