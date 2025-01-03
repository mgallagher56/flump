import { useMediaQuery } from '@chakra-ui/react';

const useIsMobile = (ssr = true) => !useMediaQuery(['(min-width: 768px)'], { ssr });

export default useIsMobile;
