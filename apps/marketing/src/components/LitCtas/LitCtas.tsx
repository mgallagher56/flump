import { Button, usePrefersReducedMotion } from "@repo/ui";
import { cx } from "@repo/ui/styled-system/css";
import { type FC, useEffect, useRef } from "react";
import { litButton, row } from "./LitCtas.styles";

/** Where the light sits and how far the button leans, for a pointer over a button's box. */
export interface PointerLight {
  /** The light's centre, in px from the button's top-left. */
  readonly lx: number;
  readonly ly: number;
  /** The lean towards the pointer, in px: at most 2 across and 1.5 down each way. */
  readonly tx: number;
  readonly ty: number;
}

/**
 * Prototype 11's pointer light for a button (its round three kit, from 1b): the light follows the
 * pointer, and the button leans towards it by up to 2px across and 1.5px down.
 */
export function pointerLightAt(
  clientX: number,
  clientY: number,
  box: { left: number; top: number; width: number; height: number },
): PointerLight {
  const x = clientX - box.left;
  const y = clientY - box.top;
  const share = (n: number, of: number) => (of > 0 ? n / of - 0.5 : 0);
  const round = (n: number) => Math.round(n * 100) / 100 + 0;
  return {
    lx: round(x),
    ly: round(y),
    tx: round(share(x, box.width) * 4),
    ty: round(share(y, box.height) * 3),
  };
}

export interface LitCtasProps {
  /** Where "Interactive preview" goes: the preview, or one section of it. */
  previewHref?: string;
  className?: string;
}

/**
 * The hero's call to action with prototype 11's pointer light (`p11/hero/LitCtas.tsx`): under a
 * mouse a soft light follows the pointer inside the button and the button leans a little towards
 * it, easing back on leave; a press presses it in. Touch, pen and reduced motion get the plain
 * button: no listeners and nothing written. One primary button, "Interactive preview": invite
 * links are shared by hand, so nothing asks for an invite (owner and coordinator, 28 Nov 2026).
 */
export const LitCtas: FC<LitCtasProps> = ({ previewHref = "/preview", className }) => {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    const root = ref.current;
    if (!root || reduced) return;
    let frame = 0;
    let latest: PointerEvent | null = null;
    const paint = () => {
      frame = 0;
      const event = latest;
      const light = (event?.target as Element | null)?.closest<HTMLElement>("[data-light]");
      if (!event || !light) return;
      const r = light.getBoundingClientRect();
      const at = pointerLightAt(event.clientX, event.clientY, r);
      light.style.setProperty("--lx", `${at.lx}px`);
      light.style.setProperty("--ly", `${at.ly}px`);
      light.style.setProperty("--tx", `${at.tx}px`);
      light.style.setProperty("--ty", `${at.ty}px`);
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") return;
      latest = event;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const settle = (node: HTMLElement) => {
      node.style.setProperty("--tx", "0px");
      node.style.setProperty("--ty", "0px");
    };
    const out = (event: PointerEvent) => {
      const from = (event.target as Element | null)?.closest<HTMLElement>("[data-light]");
      const to = (event.relatedTarget as Element | null)?.closest?.("[data-light]");
      if (from && from !== to) settle(from);
    };
    root.addEventListener("pointermove", move);
    root.addEventListener("pointerout", out);
    return () => {
      if (frame) cancelAnimationFrame(frame);
      root.removeEventListener("pointermove", move);
      root.removeEventListener("pointerout", out);
      for (const node of Array.from(root.querySelectorAll<HTMLElement>("[data-light]"))) {
        for (const name of ["--lx", "--ly", "--tx", "--ty"]) node.style.removeProperty(name);
      }
    };
  }, [reduced]);

  return (
    <div className={cx(row, className)} data-lit-ctas="" ref={ref}>
      <Button asChild size="lg" variant="primary">
        <a className={litButton} data-light="" href={previewHref}>
          Interactive preview
        </a>
      </Button>
    </div>
  );
};
