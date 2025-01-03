import customRender from '~/testUtils/customRender';


import FLPHeading from './FLPHeading';

const sampleText =
  'Lorem, ipsum dolor sit amet consectetur adipisicing elit. Nemo quaerat repellendus numquam et esse ut labore molestias nihil optio expedita atque, quas eligendi corrupti quasi impedit suscipit sunt.';

describe('FLPHeading', () => {
  test('renders as expected', () => {
    const { container } =customRender(<FLPHeading as="h1">{sampleText}</FLPHeading>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a size', () => {
    const { container } =customRender(<FLPHeading size="lg">{sampleText}</FLPHeading>);
    expect(container).toMatchSnapshot();
  });
  test('renders as expected with a color', () => {
    const { container } =customRender(<FLPHeading colorPalette="blue">{sampleText}</FLPHeading>);
    expect(container).toMatchSnapshot();
  });
  test('render only number of lines', () => {
    const { container } =customRender(
      <FLPHeading as="h1" size="4xl">
        {sampleText}
      </FLPHeading>
    );
    expect(container).toMatchSnapshot();
  });
});
