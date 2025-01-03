import { render } from '@testing-library/react';

import HomeLogo from './HomeLogo';

describe('<HomeLogo />', () => {
  test('renders as expected', () => {
    const { baseElement } = render(<HomeLogo />);
    expect(baseElement).toMatchSnapshot();
  });
});
