import customRender from '~/testUtils/customRender';


import FLPBox from './FLPBox';

describe('FLPBox', () => {
  test('renders', () => {
    const { container, getByText } =customRender(
      <FLPBox>
        <div>FLPBox</div>
      </FLPBox>
    );
    const linkElement = getByText('FLPBox');
    expect(linkElement).toBeDefined();
    expect(container).toMatchSnapshot();
  });
});
