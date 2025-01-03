import { render } from '@testing-library/react';

import FLPBox from './FLPBox';

describe('FLPBox', () => {
  test('renders', () => {
    const { container, getByText } = render(
      <FLPBox>
        <div>FLPBox</div>
      </FLPBox>
    );
    const linkElement = getByText('FLPBox');
    expect(linkElement).toBeDefined();
    expect(container).toMatchSnapshot();
  });
});
