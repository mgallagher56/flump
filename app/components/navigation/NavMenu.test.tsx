import { render } from '@testing-library/react';
import NavMenu from '~/components/navigation/NavMenu';

const mockRoutes = [
  {
    key: 'Home',
    route: '/'
  },
  {
    key: 'Accounts',
    route: '/accounts'
  }
];

describe('<NavMenu />', () => {
  test('renders as expected when not logged in', () => {
    const { baseElement } = render(<NavMenu routes={mockRoutes} />);
    expect(baseElement).toMatchSnapshot();
  });
  test('renders as expected when logged in and showAppLink is true', () => {
    const { baseElement } = render(<NavMenu routes={mockRoutes} />);
    expect(baseElement).toMatchSnapshot();
  });
});
