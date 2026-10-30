import type { CSSProperties, HTMLAttributes } from "react";
import "./gradual-blur.css";

export type GradualBlurProps = Omit<HTMLAttributes<HTMLDivElement>, "children"> & {
  /** Which edge of the container it sits on. */
  edge?: "top" | "bottom" | "left" | "right";
  /** How far in from the edge it reaches, as any CSS length. Defaults to --ds-space-3xl. */
  size?: string;
  /** subtle, normal or strong. Sets the blur of the outermost layer from the --ds-blur steps. */
  strength?: "subtle" | "normal" | "strong";
  /** How many layers, 2 to 8. Each one is a backdrop-filter, so fewer is cheaper. */
  layers?: number;
  /** Fade to the page colour on top of the blur. */
  fade?: boolean;
  /** "absolute" fills its positioned parent's edge, "sticky" sticks to the edge of the scroller it's in, "fixed" to the screen. */
  position?: "absolute" | "sticky" | "fixed";
  /** Keep it showing when the scroller is at that end. By default it fades away there. */
  always?: boolean;
};

/* Blurs whatever scrolls under it, more the closer it gets to the edge. Decorative, so it's hidden from
   screen readers and ignores the pointer. Don't give its parent overflow, opacity, a mask or a filter. */
export default function GradualBlur({
  edge = "bottom",
  size,
  strength = "normal",
  layers = 6,
  fade = false,
  position = "absolute",
  always = false,
  className,
  style,
  ...rest
}: GradualBlurProps) {
  const count = Math.min(8, Math.max(2, Math.round(layers)));
  const classes = [
    "ob-gradual-blur",
    `ob-gradual-blur--${edge}`,
    strength !== "normal" && `ob-gradual-blur--${strength}`,
    fade && "ob-gradual-blur--fade",
    position !== "absolute" && `ob-gradual-blur--${position}`,
    always && "ob-gradual-blur--always",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  const sized = size ? ({ "--ob-gradual-blur-size": size, ...style } as CSSProperties) : style;
  return (
    <div {...rest} className={classes} style={sized} aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <span key={i} />
      ))}
    </div>
  );
}
