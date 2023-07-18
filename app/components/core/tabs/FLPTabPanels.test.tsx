import type { ReactElement, ReactNode } from 'react';

import { Tabs } from '@chakra-ui/react';
import { render } from '@testing-library/react';

import FLPTabPanels from './FLPTabPanels';

const tabWrapper = (children: ReactNode): ReactElement => <Tabs>{children}</Tabs>;

describe('FLPTabList', () => {
  test('renders correctly', () => {
    const { container } = render(
      tabWrapper(
        <FLPTabPanels>
          <div>Tab panel 1</div>
          <div>Tab panel 2</div>
          <div>Tab panel 3</div>
        </FLPTabPanels>
      )
    );
    expect(container).toMatchSnapshot();
  });
});
