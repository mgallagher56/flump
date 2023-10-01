import { fireEvent, render } from '@testing-library/react';
import { vi } from 'vitest';

import FLPButton from '../buttons/FLPButton';
import FLPModal from './FLPModal';

const mocks = vi.hoisted(() => ({
  mockOnConfirm: vi.fn()
}));

describe('<FLPModal />', () => {
  const { baseElement, getByText } = render(
    <FLPModal
      children={<div>Modal Content</div>}
      confirmButton={{
        text: 'Confirm',
        colorScheme: 'blue',
        variant: 'solid'
      }}
      title="Modal Title"
      triggerBtn={<FLPButton>Trigger</FLPButton>}
      onConfirm={mocks.mockOnConfirm}
    />
  );
  const triggerBtn = getByText('Trigger');
  fireEvent.click(triggerBtn);
  it('renders by default as expected', () => {
    const confirmButton = getByText('Confirm');
    fireEvent.click(confirmButton);
    expect(mocks.mockOnConfirm).toHaveBeenCalled();
    const htmlString = baseElement.outerHTML.toString();
    const baseElementConstant = htmlString.replaceAll(/style="[^"]*"/g, '');
    expect(baseElementConstant).toMatchSnapshot();
  });
});
