import type { ButtonHTMLAttributes } from "react";
import { cn } from "../theme/helpers";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  isLoading?: boolean;
};

const base =
  "inline-flex items-center justify-center gap-2 select-none whitespace-nowrap " +
  "transition-[transform,filter,background,color,border-color] duration-200 " +
  "disabled:opacity-60 disabled:cursor-not-allowed " +
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.35)]";

const bySize: Record<Size, string> = {
  sm: "h-9 px-3 text-sm rounded-[14px]",
  md: "h-11 px-4 text-sm rounded-[16px]",
  lg: "h-12 px-5 text-base rounded-[18px]",
};

const byVariant: Record<Variant, string> = {
  primary:
    "text-[#14110a] bg-[linear-gradient(135deg,#F6E27A_0%,#D4AF37_55%,#B88A1E_100%)] " +
    "shadow-[0_14px_30px_rgba(0,0,0,0.40)] hover:brightness-105 active:brightness-95",
  secondary:
    "border border-[rgba(255,255,255,0.14)] bg-[rgba(10,40,28,0.35)] text-[rgba(245,246,248,0.92)] " +
    "hover:bg-[rgba(10,40,28,0.50)]",
  ghost:
    "text-[rgba(245,246,248,0.82)] hover:bg-[rgba(255,255,255,0.06)]",
};

export default function Button({
  variant = "secondary",
  size = "md",
  isLoading,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        base,
        bySize[size],
        byVariant[variant],
        "active:translate-y-[1px]",
        className
      )}
      {...props}
    >
      {isLoading ? (
        <>
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[rgba(0,0,0,0.18)] border-t-[rgba(0,0,0,0.55)]" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
}
