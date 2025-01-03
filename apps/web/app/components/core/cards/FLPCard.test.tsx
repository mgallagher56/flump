import customRender from '~/testUtils/customRender';

import FLPCard from './FLPCard';

describe('<FlpCard />', () => {
  test('it renders a ChakraUI Card component with title as expected', () => {
    const { container } =customRender(<FLPCard title="FLPCard" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
