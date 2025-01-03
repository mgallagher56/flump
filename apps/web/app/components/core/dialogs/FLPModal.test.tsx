import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import FLPButton from '~/components/core/buttons/FLPButton';
import customRender from '~/testUtils/customRender';

import FLPModal from './FLPModal';

const mocks = vi.hoisted(() => ({
  mockOnConfirm: vi.fn()
}));

describe('<FLPModal />', () => {
  const { baseElement, getByText } = customRender(
    <FLPModal
      confirmButton={{
        text: 'Confirm',
        colorPalette: 'blue'
      }}
      open={true}
      title="Modal Title"
      triggerBtn={<FLPButton>Trigger</FLPButton>}
      onClose={vi.fn()}
      onConfirm={mocks.mockOnConfirm}
    >
      <div>Modal Content</div>
    </FLPModal>
  );
  const triggerBtn = getByText('Trigger');
  fireEvent.click(triggerBtn);
  test('renders by default as expected', () => {
    const confirmButton = getByText('Confirm');
    fireEvent.click(confirmButton);
    expect(mocks.mockOnConfirm).toHaveBeenCalled();
    const htmlString = baseElement.outerHTML.toString();
    const baseElementConstant = htmlString.replaceAll(/style="[^"]*"/g, '');
    expect(baseElementConstant).toMatchSnapshot();
  });
});
