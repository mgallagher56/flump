import type { ReactElement, ReactNode } from 'react';

import { Tabs } from '@chakra-ui/react';
import { render } from '@testing-library/react';

import FLPTabList from './FLPTabList';

const tabWrapper = (children: ReactNode): ReactElement => <Tabs>{children}</Tabs>;

describe('FLPTabList', () => {
  test('renders correctly', () => {
    const { container } = render(
      tabWrapper(
        <FLPTabList>
          <div>Tab 1</div>
          <div>Tab 2</div>
          <div>Tab 3</div>
        </FLPTabList>
      )
    );
    expect(container).toMatchSnapshot();
  });
});
