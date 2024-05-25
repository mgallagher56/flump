import { render } from '@testing-library/react';

import FLPCard from './FLPCard';

describe('<FlpCard />', () => {
  test('it renders a ChakraUI Card component with title as expected', () => {
    const { container } = render(<FLPCard title="FLPCard" />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
