import customRender from '~/testUtils/customRender';


import NavMenu from './NavMenu';

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
    const { baseElement } =customRender(<NavMenu routes={mockRoutes} />);
    expect(baseElement).toMatchSnapshot();
  });
  test('renders as expected when logged in and showAppLink is true', () => {
    const { baseElement } =customRender(<NavMenu routes={mockRoutes} />);
    expect(baseElement).toMatchSnapshot();
  });
});
