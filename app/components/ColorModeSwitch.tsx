import type { FC } from 'react';

import { useColorMode } from '@chakra-ui/react';

import FLPButton from './core/buttons/FLPButton';

const ColorModeSwitch: FC = () => {
  const { colorMode, toggleColorMode } = useColorMode();
  return (
    <FLPButton id={'colorModeSwitch'} padding={0} variant="outline" onPress={toggleColorMode}>
      {colorMode === 'light' ? '🌚' : '☀️'}
    </FLPButton>
  );
};

export default ColorModeSwitch;
