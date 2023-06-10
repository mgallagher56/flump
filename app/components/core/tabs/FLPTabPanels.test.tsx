import React from 'react';

import { Tabs } from '@chakra-ui/react';
import { render } from '@testing-library/react';
import { describe, expect, test } from 'vitest';

import FLPTabPanels from './FLPTabPanels';

const tabWrapper = (children: React.ReactNode): React.ReactElement => <Tabs>{children}</Tabs>;

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
