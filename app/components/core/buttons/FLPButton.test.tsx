import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import FLPButton from './FLPButton';

describe('FLPButton', () => {
  it('should render correctly', () => {
    const { container } = render(<FLPButton>FLPButton</FLPButton>);
    expect(container).toMatchSnapshot();
  });

  it('should render correctly with props', () => {
    const { container } = render(
      <FLPButton colorScheme="green" isDisabled preventFocusOnPress variant="outline" isLoading>
        FLPButton
      </FLPButton>
    );
    expect(container).toMatchSnapshot();
  });

  it('should call onPress when clicked', () => {
    const onPress = vi.fn();
    render(<FLPButton onPress={onPress}>FLPButton</FLPButton>);
    fireEvent.click(screen.getByText('FLPButton'));

    expect(onPress).toHaveBeenCalled();
  });

  it('should not call onPress when clicked and isDisabled is true', () => {
    const onPress = vi.fn();
    render(
      <FLPButton onPress={onPress} isDisabled>
        FLPButton
      </FLPButton>
    );
    fireEvent.click(screen.getByText('FLPButton'));
    expect(onPress).not.toHaveBeenCalled();
  });

  it('should not call onPress when clicked and preventFocusOnPress is true', () => {
    const onPress = vi.fn();
    render(
      <FLPButton onPress={onPress} preventFocusOnPress>
        FLPButton
      </FLPButton>
    );
    fireEvent.click(screen.getByText('FLPButton'));
    expect(onPress).toHaveBeenCalled();
  });

  it('should not call onPress when clicked and isLoading is true', () => {
    const onPress = vi.fn();
    render(
      <FLPButton onPress={onPress} isLoading>
        FLPButton
      </FLPButton>
    );
    fireEvent.click(screen.getByText('FLPButton'));
    expect(onPress).not.toHaveBeenCalled();
  });
});
