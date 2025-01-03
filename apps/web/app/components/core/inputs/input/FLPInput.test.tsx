import { fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import customRender from '~/testUtils/customRender';

import FLPInput from './FLPInput';

const onChangeMock = vi.fn();

describe('<FLPInput />', () => {
  test('should render as expected', () => {
    const { container } = customRender(<FLPInput label="Test" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });
  test('should render as expected with error', () => {
    const { container } = customRender(<FLPInput error="Error" label="Test" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });
  test('should render as expected with value', () => {
    const { container } = customRender(<FLPInput label="Test" value="Value" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });
  test('should render as expected with value and error', () => {
    const { container } = customRender(<FLPInput error="Error" label="Test" value="Value" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });
  test('should render as expected without a label', () => {
    const { container } = customRender(<FLPInput isLabelHidden label="Test" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });

  test('should render elements as a row', () => {
    const { container } = customRender(<FLPInput flexDirection="row" label="Test" onChange={onChangeMock} />);
    expect(container).toMatchSnapshot();
  });

  test('should change the value when typing', () => {
    const { getByLabelText } = customRender(<FLPInput label="Test" onChange={onChangeMock} />);
    const input = getByLabelText('Test') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'Test' } });
    expect(onChangeMock).toHaveBeenCalled();
    expect(input.value).toBe('Test');
  });
});
