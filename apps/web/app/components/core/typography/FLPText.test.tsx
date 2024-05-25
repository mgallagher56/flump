import { render } from '@testing-library/react';

import FLPText from './FLPText';

const sampleText =
  'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nemo quaerat repellendus numquam et esse ut labore molestias nihil optio expedita atque, quas eligendi corrupti quasi impedit suscipit sunt.';

describe('FLPText', () => {
  test('renders as expected', () => {
    const { container } = render(<FLPText>{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a fontSiez', () => {
    const { container } = render(<FLPText fontSize="20">{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a fontWeight', () => {
    const { container } = render(<FLPText fontWeight="bold">{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a lineHeight', () => {
    const { container } = render(<FLPText lineHeight={40}>{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a letterSpacing', () => {
    const { container } = render(<FLPText letterSpacing="widest">{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
});
