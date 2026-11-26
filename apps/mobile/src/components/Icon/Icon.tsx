import { useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Line, Path, Rect } from "react-native-svg";
import { ICON_SHAPES, type IconShape } from "../../navigation/iconShapes";
import type { IconName } from "../../navigation/navItems";
import { useTheme } from "../../theme/ThemeProvider";
import { createStyles, ICON_SIZES, type IconColor, type IconSize } from "./Icon.styles";

export interface IconProps {
  name: IconName;
  /** Defaults to `md` (24 points), web's `Icon` default. */
  size?: IconSize;
  /** Defaults to `secondary`. */
  color?: IconColor;
  testID?: string;
}

function Shape({ shape }: { shape: IconShape }) {
  switch (shape[0]) {
    case "path":
      return <Path d={shape[1].d} />;
    case "circle":
      return <Circle {...shape[1]} />;
    case "rect":
      return <Rect {...shape[1]} />;
    case "line":
      return <Line {...shape[1]} />;
  }
}

/**
 * One of the lucide icons web's navigation uses, in a theme colour. Always decorative: the control
 * or row it sits in carries the name, so the icon is hidden from screen readers.
 */
export function Icon({ name, size = "md", color = "secondary", testID }: IconProps) {
  const theme = useTheme();
  const { box, stroke } = useMemo(() => createStyles(theme), [theme]);
  const side = ICON_SIZES[size];
  return (
    <View
      testID={testID}
      style={box[size]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Svg
        width={side}
        height={side}
        viewBox="0 0 24 24"
        fill="none"
        stroke={stroke[color]}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {ICON_SHAPES[name].map((shape, i) => (
          // The shapes are fixed data, so their order is their identity.
          <Shape key={i} shape={shape} />
        ))}
      </Svg>
    </View>
  );
}
