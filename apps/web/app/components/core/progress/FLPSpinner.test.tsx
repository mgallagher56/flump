import customRender from '~/testUtils/customRender';

import FLPText from '~/components/core/typography/FLPText';

import FLPSpinner from './FLPSpinner';

describe('FLPSpinner', () => {
  test('renders as expected', () => {
    const { container } =customRender(<FLPSpinner />);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a size', () => {
    const { container } =customRender(<FLPSpinner size="xl" />);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a label', () => {
    const { container } =customRender(
      <FLPSpinner>
        <FLPText>Processing...</FLPText>
      </FLPSpinner>
    );
    expect(container).toMatchSnapshot();
  });
});
