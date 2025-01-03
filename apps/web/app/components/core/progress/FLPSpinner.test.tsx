import { render } from '@testing-library/react';
import FLPText from '~/components/core/typography/FLPText';

import FLPSpinner from './FLPSpinner';

describe('FLPSpinner', () => {
  test('renders as expected', () => {
    const { container } = render(<FLPSpinner />);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a size', () => {
    const { container } = render(<FLPSpinner size="xl" />);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a label', () => {
    const { container } = render(
      <FLPSpinner>
        <FLPText>Processing...</FLPText>
      </FLPSpinner>
    );
    expect(container).toMatchSnapshot();
  });
});
