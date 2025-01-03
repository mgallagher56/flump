import { fireEvent, screen } from '@testing-library/react';
import { vi } from 'vitest';
import customRender from '~/testUtils/customRender';

import FLPButton from './FLPButton';

describe('FLPButton', () => {
  test('should render correctly', () => {
    const { container } = customRender(<FLPButton>FLPButton</FLPButton>);
    expect(container).toMatchSnapshot();
  });

  test('should render correctly with props', () => {
    const { container } = customRender(
      <FLPButton disabled loading colorPalette="green" variant="outline">
        FLPButton
      </FLPButton>
    );
    expect(container).toMatchSnapshot();
  });

  test('should call onClick when clicked', () => {
    const onClick = vi.fn();
    customRender(<FLPButton onClick={onClick}>FLPButton</FLPButton>);
    fireEvent.click(screen.getByText('FLPButton'));

    expect(onClick).toHaveBeenCalled();
  });

  test('should not call onClick when clicked and disabled is true', () => {
    const onClick = vi.fn();
    const { baseElement } = customRender(
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
    customRender(<FLPButton onClick={onClick}>FLPButton</FLPButton>);
    fireEvent.click(screen.getByText('FLPButton'));
    expect(onClick).toHaveBeenCalled();
  });

  test('should not call onClick when clicked and isLoading is true', () => {
    const onClick = vi.fn();
    customRender(
      <FLPButton loading onClick={onClick}>
        FLPButton
      </FLPButton>
    );
    fireEvent.click(screen.getByText('FLPButton'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
