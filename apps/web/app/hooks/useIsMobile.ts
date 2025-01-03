import { useMediaQuery } from '@chakra-ui/react';

const useIsMobile = () => !useMediaQuery(['(min-width: 768px)'], { ssr: true })[0];

export default useIsMobile;
