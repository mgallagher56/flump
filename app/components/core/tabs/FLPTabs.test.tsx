import { render, screen } from '@testing-library/react';
import type { TabData } from '~/components/core/tabs/types';

import FLPTabs from './FLPTabs';

const mockTabData: TabData[] = [
  {
    children: <div>Tab content 1</div>,
    disabled: false,
    label: 'Tab 1',
    value: 'tab1'
  },
  {
    children: <div>Tab content 2</div>,
    disabled: false,
    label: 'Tab 2',
    value: 'tab2'
  },
  {
    children: <div>Tab content 3</div>,
    disabled: true,
    label: 'Tab 3',
    value: 'tab3'
  }
];

const ariaSelectedValue = (tab: HTMLElement): string => tab['attributes']?.['aria-selected']?.value;
describe('FLPTabs', () => {
  test('renders correctly', () => {
    const { container } = render(<FLPTabs data={mockTabData} />);
    expect(container).toMatchSnapshot();
    const tab1 = screen.getByText('Tab 1');
    const tab2 = screen.getByText('Tab 2');
    const tab3 = screen.getByText('Tab 3');
    expect(ariaSelectedValue(tab1)).toBe('true');
    expect(ariaSelectedValue(tab2)).toBe('false');
    expect(ariaSelectedValue(tab3)).toBe('false');
  });
});
