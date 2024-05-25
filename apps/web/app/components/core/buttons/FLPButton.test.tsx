import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

import FLPButton from './FLPButton';

describe('FLPButton', () => {
  test('should render correctly', () => {
    const { container } = render(<FLPButton>FLPButton</FLPButton>);
    expect(container).toMatchSnapshot();
  });

  test('should render correctly with props', () => {
    const { container } = render(
      <FLPButton colorScheme="green" disabled variant="outline" isLoading>
        FLPButton
      </FLPButton>
    );
    expect(container).toMatchSnapshot();
  });

  test('should call onClick when clicked', () => {
    const onClick = vi.fn();
    render(<FLPButton onClick={onClick}>FLPButton</FLPButton>);
    fireEvent.click(screen.getByText('FLPButton'));

    expect(onClick).toHaveBeenCalled();
  });

  test('should not call onClick when clicked and disabled is true', () => {
    const onClick = vi.fn();
    const { baseElement } = render(
      <FLPButton disabled onClick={onClick}>
        FLPButton
      </FLPButton>
    );
    expect(baseElement).toMatchSnapshot();
    fireEvent.click(screen.getByText('FLPButton'));
    expect(onClick).not.toHaveBeenCalled();
  });

  test('should not call onClick when clicked and  is true', () => {
    const onClick = vi.fn();
    render(<FLPButton onClick={onClick}>FLPButton</FLPButton>);
    fireEvent.click(screen.getByText('FLPButton'));
    expect(onClick).toHaveBeenCalled();
  });

  test('should not call onClick when clicked and isLoading is true', () => {
    const onClick = vi.fn();
    render(
      <FLPButton onClick={onClick} isLoading>
        FLPButton
      </FLPButton>
    );
    fireEvent.click(screen.getByText('FLPButton'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
