import { useId, useMemo } from "react";
import { View } from "react-native";
import Svg, { Circle, Defs, Ellipse, G, RadialGradient, Stop } from "react-native-svg";
import { useTheme } from "../../theme/ThemeProvider";
import {
  createStyles,
  type FlumpLogoSize,
  floorLayout,
  LOGO_ART,
  LOGO_SIZES,
  orbLayout,
} from "./FlumpLogo.styles";

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

const floor = floorLayout(LOGO_ART.floor);

/**
 * The Flump logo, three glass bubbles over one floor shadow ("K2"), drawn in theme colours so it
 * follows light and dark (CROSS-PLATFORM section 6). Static: no motion.
 */
export function FlumpLogo({ size = "md", label, testID }: FlumpLogoProps) {
  const theme = useTheme();
  const uid = `flump-logo-${useId().replace(/[^\w-]/g, "")}`;
  const side = LOGO_SIZES[size];
  const { box, paint, opacity, dark } = useMemo(() => createStyles(theme), [theme]);
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
          <RadialGradient id={`${uid}-contact`}>
            <Stop offset="0" stopColor={paint.shadow} stopOpacity={0.75} />
            <Stop offset="0.6" stopColor={paint.shadow} stopOpacity={0.4} />
            <Stop offset="1" stopColor={paint.shadow} stopOpacity={0} />
          </RadialGradient>
          <RadialGradient id={`${uid}-pool`}>
            <Stop offset="0" stopColor={paint.teal} stopOpacity={0.5} />
            <Stop offset="0.45" stopColor={paint.teal} stopOpacity={0.2} />
            <Stop offset="1" stopColor={paint.teal} stopOpacity={0} />
          </RadialGradient>
          {LOGO_ART.orbs.flatMap((orb, i) => {
            const { body, rim, sheen } = orbLayout(orb);
            const tone = paint[orb.tone];
            const light = paint[orb.light];
            return [
              <RadialGradient
                key={`body-${i}`}
                id={`${uid}-${i}-body`}
                gradientUnits="userSpaceOnUse"
                {...body}
              >
                <Stop offset="0" stopColor={tone} stopOpacity={opacity.core} />
                <Stop offset="0.62" stopColor={tone} stopOpacity={opacity.mid} />
                <Stop offset="1" stopColor={tone} stopOpacity={1} />
              </RadialGradient>,
              <RadialGradient
                key={`rim-${i}`}
                id={`${uid}-${i}-rim`}
                gradientUnits="userSpaceOnUse"
                {...rim}
              >
                <Stop offset="0" stopColor={light} stopOpacity={0.95} />
                <Stop offset="0.55" stopColor={light} stopOpacity={0.35} />
                <Stop offset="1" stopColor={light} stopOpacity={0} />
              </RadialGradient>,
              <RadialGradient
                key={`sheen-${i}`}
                id={`${uid}-${i}-sheen`}
                gradientUnits="userSpaceOnUse"
                {...sheen}
              >
                <Stop offset="0" stopColor={paint.glint} stopOpacity={opacity.sheen} />
                <Stop offset="1" stopColor={paint.glint} stopOpacity={0} />
              </RadialGradient>,
            ];
          })}
        </Defs>
        {dark ? (
          <G>
            <Ellipse {...floor.contact} fill={`url(#${uid}-contact)`} />
            <Ellipse {...floor.pool} fill={`url(#${uid}-pool)`} />
          </G>
        ) : (
          <Ellipse {...floor.light} fill={paint.shadow} />
        )}
        {/* Every light sits inside its bubble, so each paints a circle and needs no clip. */}
        {LOGO_ART.orbs.map((orb, i) => {
          const { glint } = orbLayout(orb);
          const circle = { cx: orb.cx, cy: orb.cy, r: orb.r };
          return (
            <G key={orb.tone}>
              <Circle {...circle} fill={paint.backing} opacity={opacity.backing} />
              <Circle {...circle} fill={`url(#${uid}-${i}-body)`} />
              <Circle {...circle} fill={`url(#${uid}-${i}-rim)`} />
              <Circle {...circle} fill={`url(#${uid}-${i}-sheen)`} />
              {orb.glint ? (
                <Ellipse
                  cx={glint.cx}
                  cy={glint.cy}
                  rx={glint.rx}
                  ry={glint.ry}
                  transform={glint.transform}
                  fill={paint.glint}
                  opacity={opacity.glint}
                />
              ) : null}
            </G>
          );
        })}
      </Svg>
    </View>
  );
}
