import type { FC } from "react";
import { css } from "../../../styled-system/css";
import { colors, semanticTokens } from "../../tokens";
import { swatchCard, swatchGrid, swatchMeta, swatchTile } from "./ColorPalette.styles";

function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  if (cleanHex.length !== 6) return 0.5;
  const r = parseInt(cleanHex.substring(0, 2), 16) / 255;
  const g = parseInt(cleanHex.substring(2, 4), 16) / 255;
  const b = parseInt(cleanHex.substring(4, 6), 16) / 255;

  const [a0 = 0, a1 = 0, a2 = 0] = [r, g, b].map((v) => {
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });

  return a0 * 0.2126 + a1 * 0.7152 + a2 * 0.0722;
}

function getContrast(hex1: string, hex2: string): string {
  try {
    const lum1 = getLuminance(hex1);
    const lum2 = getLuminance(hex2);
    const brightest = Math.max(lum1, lum2);
    const darkest = Math.min(lum1, lum2);
    const ratio = (brightest + 0.05) / (darkest + 0.05);
    return `${ratio.toFixed(1)}:1`;
  } catch {
    return "N/A";
  }
}

export const ColorPalette: FC = () => {
  const primitivePalettes = [
    { name: "Indigo (Brand)", scale: colors.indigo },
    { name: "Slate (Surfaces & Text)", scale: colors.slate },
    { name: "Success", scale: colors.success },
    { name: "Warning", scale: colors.warning },
    { name: "Destructive", scale: colors.destructive },
    { name: "Info", scale: colors.info },
    { name: "Purple (Trimmed Chart)", scale: colors.purple },
    { name: "Cyan (Trimmed Chart)", scale: colors.cyan },
  ];

  return (
    <div
      className={css({
        p: { base: "16px", md: "24px" },
        backgroundColor: "surface.canvas",
        color: "text.primary",
        minHeight: "100%",
      })}
    >
      <div className={css({ mb: "32px" })}>
        <h1
          className={css({
            fontFamily: "display",
            fontSize: "2xl",
            fontWeight: "bold",
            color: "text.primary",
          })}
        >
          Flump Color System & Semantic Tokens
        </h1>
        <p className={css({ fontSize: "sm", color: "text.muted", mt: "4px" })}>
          Strict 6 canonical namespaces: <code>primary</code>, <code>surface</code>,{" "}
          <code>text</code>, <code>border</code>, <code>status</code>, and <code>chart</code>.
        </p>
      </div>

      {/* Semantic Tokens Comparison Table */}
      <section className={css({ mb: "40px" })}>
        <h2
          className={css({
            fontFamily: "display",
            fontSize: "lg",
            fontWeight: "semibold",
            mb: "12px",
          })}
        >
          Canonical Semantic Tokens (Light & Dark Contract)
        </h2>
        <div
          className={css({
            overflowX: "auto",
            borderRadius: "xl",
            borderWidth: "1px",
            borderStyle: "solid",
            borderColor: "border.subtle",
            backgroundColor: "surface.card",
          })}
        >
          <table className={css({ width: "100%", borderCollapse: "collapse", fontSize: "xs" })}>
            <thead>
              <tr
                className={css({
                  backgroundColor: "surface.subtle",
                  borderBottomWidth: "1px",
                  borderBottomColor: "border.subtle",
                })}
              >
                <th className={css({ p: "10px 14px", textAlign: "left", fontWeight: "semibold" })}>
                  Namespace
                </th>
                <th className={css({ p: "10px 14px", textAlign: "left", fontWeight: "semibold" })}>
                  Token Key
                </th>
                <th className={css({ p: "10px 14px", textAlign: "left", fontWeight: "semibold" })}>
                  Light Mode Base
                </th>
                <th className={css({ p: "10px 14px", textAlign: "left", fontWeight: "semibold" })}>
                  Dark Mode Value
                </th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(semanticTokens.colors).flatMap(([namespace, tokenObj]) =>
                Object.entries(tokenObj).map(([tokenKey, tokenDef]: [string, any]) => {
                  const val = tokenDef.value;
                  const isObj = typeof val === "object" && val !== null;
                  const baseVal = isObj ? val.base : String(val);
                  const darkVal = isObj ? val._dark : "inherit";
                  return (
                    <tr
                      key={`${namespace}.${tokenKey}`}
                      className={css({
                        borderBottomWidth: "1px",
                        borderBottomColor: "border.subtle",
                        "&:hover": { backgroundColor: "surface.subtle" },
                      })}
                    >
                      <td
                        className={css({ p: "8px 14px", fontWeight: "semibold", color: "primary" })}
                      >
                        {namespace}
                      </td>
                      <td className={css({ p: "8px 14px", fontFamily: "mono" })}>{tokenKey}</td>
                      <td
                        className={css({
                          p: "8px 14px",
                          fontFamily: "mono",
                          color: "text.secondary",
                        })}
                      >
                        {baseVal}
                      </td>
                      <td
                        className={css({ p: "8px 14px", fontFamily: "mono", color: "text.muted" })}
                      >
                        {darkVal}
                      </td>
                    </tr>
                  );
                }),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Primitive Scales */}
      {primitivePalettes.map((palette) => (
        <section key={palette.name} className={css({ mb: "32px" })}>
          <h2 className={css({ fontFamily: "display", fontSize: "md", fontWeight: "semibold" })}>
            {palette.name}
          </h2>
          <div className={swatchGrid()}>
            {Object.entries(palette.scale).map(([step, colorObj]: [string, any]) => (
              <div key={step} className={swatchCard()}>
                <div className={swatchTile()} style={{ backgroundColor: colorObj.value }}>
                  <span
                    className={css({
                      fontSize: "10px",
                      px: "4px",
                      py: "1px",
                      borderRadius: "xs",
                      backgroundColor: "rgba(0,0,0,0.45)",
                      color: "#ffffff",
                      fontFamily: "mono",
                    })}
                  >
                    {step}
                  </span>
                </div>
                <div className={swatchMeta()}>
                  <span className={css({ fontWeight: "semibold", fontSize: "xs" })}>{step}</span>
                  <span
                    className={css({ fontFamily: "mono", fontSize: "11px", color: "text.muted" })}
                  >
                    {colorObj.value}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
};

export default ColorPalette;
