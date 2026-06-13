import type { BoxProps } from "@chakra-ui/react";
import { Box } from "@chakra-ui/react";
import type { FC, PropsWithChildren } from "react";

const FLPBox: FC<PropsWithChildren<BoxProps>> = (props) => {
  return <Box {...props}>{props.children}</Box>;
};

export default FLPBox;
