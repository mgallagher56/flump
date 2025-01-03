import customRender from '~/testUtils/customRender';


import HomeLogo from './HomeLogo';

describe('<HomeLogo />', () => {
  test('renders as expected', () => {
    const { baseElement } =customRender(<HomeLogo />);
    expect(baseElement).toMatchSnapshot();
  });
});
