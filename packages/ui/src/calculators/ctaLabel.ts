/**
 * Calculators draw their own arrow icon after the sign-up label, so a caller's label that already
 * ends in an arrow ("Request an invite →") would show two. Strip any trailing arrow characters.
 */
export const ctaLabel = (text: string): string =>
  text.replace(/(?:\s*(?:→|->|›|»|>))+\s*$/u, "").trimEnd();
