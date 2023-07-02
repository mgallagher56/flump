import { render, screen } from '@testing-library/react';
import { describe, expect, test } from 'vitest';
import type { TabData } from '~/components/core/tabs/types';

import TabsContainer from './TabsContainer';

const mockTabData: TabData[] = [
  {
    content: <div>Tab content 1</div>,
    isDisabled: false,
    label: 'Tab 1',
    value: 'tab1'
  },
  {
    content: <div>Tab content 2</div>,
    isDisabled: false,
    label: 'Tab 2',
    value: 'tab2'
  },
  {
    content: <div>Tab content 3</div>,
    isDisabled: true,
    label: 'Tab 3',
    value: 'tab3'
  }
];

const ariaSelectedValue = (tab: HTMLElement): string => tab['_attributes']['aria-selected'].value;

describe('TabsContainer', () => {
  test('renders correctly', () => {
    const { container } = render(<TabsContainer data={mockTabData} />);
    expect(container).toMatchSnapshot();
    const tab1 = screen.getByText('Tab 1');
    const tab2 = screen.getByText('Tab 2');
    const tab3 = screen.getByText('Tab 3');
    expect(ariaSelectedValue(tab1)).toBe('true');
    expect(ariaSelectedValue(tab2)).toBe('false');
    expect(ariaSelectedValue(tab3)).toBe('false');
  });
});
