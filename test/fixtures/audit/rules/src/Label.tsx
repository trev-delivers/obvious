import { cn } from "./cn";
export function Label() {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide">Eyebrow</p>
      <p className={cn("uppercase", "tracking-widest")}>Split eyebrow</p>
      <p className="uppercase tracking-normal">Fine</p>
      <span className="font-mono text-[10px] rounded-[6px] bg-clip-text">x</span>
      <span style={{ borderRadius: 8, fontSize: 14 }}>y</span>
      <span style={{ textTransform: "uppercase", letterSpacing: "0.1em" }}>z</span>
    </div>
  );
}
