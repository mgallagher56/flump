import { useId, useMemo } from "react";
import { View } from "react-native";
import Svg, { Defs, Ellipse, Path, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import { createStyles, type FlumpLogoSize, LOGO_ART, LOGO_SIZES } from "./FlumpLogo.styles";

export type { FlumpLogoSize } from "./FlumpLogo.styles";

export interface FlumpLogoProps {
  /** Defaults to `md`. */
  size?: FlumpLogoSize;
  /**
   * The accessible name. Leave unset when the logo sits beside the name in words, or inside a
   * control that is already named; it is then hidden from screen readers.
   */
  label?: string;
  testID?: string;
}

/** The Flump blob, drawn in theme colours so it follows light and dark (CROSS-PLATFORM section 6). */
export function FlumpLogo({ size = "md", label, testID }: FlumpLogoProps) {
  const theme = useTheme();
  const gradientId = `flump-logo-body-${useId().replace(/[^\w-]/g, "")}`;
  const side = LOGO_SIZES[size];
  const { box, paint } = useMemo(() => createStyles(theme), [theme]);
  const named = Boolean(label?.trim());

  return (
    <View
      testID={testID}
      style={box[size]}
      {...(named
        ? { accessible: true, accessibilityRole: "image" as const, accessibilityLabel: label }
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: "no-hide-descendants" as const,
          })}
    >
      <Svg width={side} height={side} viewBox={LOGO_ART.viewBox}>
        <Defs>
          <RadialGradient id={gradientId} cx="42%" cy="30%" r="75%">
            <Stop offset="0" stopColor={paint.bodyTop} />
            <Stop offset="1" stopColor={paint.bodyBottom} />
          </RadialGradient>
        </Defs>
        <Ellipse
          cx={LOGO_ART.shadow.cx}
          cy={LOGO_ART.shadow.cy}
          rx={LOGO_ART.shadow.rx}
          ry={LOGO_ART.shadow.ry}
          fill={paint.shadow}
          opacity={LOGO_ART.shadow.opacity}
        />
        <Path d={LOGO_ART.body} fill={`url(#${gradientId})`} />
        {LOGO_ART.highlights.map((h) => (
          <Path key={h.d} d={h.d} fill={paint.highlight} opacity={h.opacity} />
        ))}
      </Svg>
    </View>
  );
}
