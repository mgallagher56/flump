import { render } from '@testing-library/react';
import HomeLogo from '~/components/navigation/HomeLogo';

describe('<HomeLogo />', () => {
  test('renders as expected', () => {
    const { baseElement } = render(<HomeLogo />);
    expect(baseElement).toMatchSnapshot();
  });
});
