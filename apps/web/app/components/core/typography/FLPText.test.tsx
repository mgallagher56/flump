import customRender from '~/testUtils/customRender';


import FLPText from './FLPText';

const sampleText =
  'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nemo quaerat repellendus numquam et esse ut labore molestias nihil optio expedita atque, quas eligendi corrupti quasi impedit suscipit sunt.';

describe('FLPText', () => {
  test('renders as expected', () => {
    const { container } =customRender(<FLPText>{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a fontSiez', () => {
    const { container } =customRender(<FLPText fontSize="20">{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a fontWeight', () => {
    const { container } =customRender(<FLPText fontWeight="bold">{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a lineHeight', () => {
    const { container } =customRender(<FLPText lineHeight={40}>{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a letterSpacing', () => {
    const { container } =customRender(<FLPText letterSpacing="widest">{sampleText}</FLPText>);
    expect(container).toMatchSnapshot();
  });
});
