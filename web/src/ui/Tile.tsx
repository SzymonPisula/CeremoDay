import type { ReactNode } from "react";
import { cn } from "../theme/helpers";

type Props = {
  title?: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children?: ReactNode;
  onClick?: () => void;
  className?: string;
};

export default function Tile({
  title,
  subtitle,
  icon,
  right,
  children,
  onClick,
  className,
}: Props) {
  const isClickable = typeof onClick === "function";

  return (
    <div
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onClick={(e) => {
        if (!isClickable) return;
        e.preventDefault();
        e.stopPropagation();
        onClick();
      }}
      onKeyDown={(e) => {
        if (!isClickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          e.stopPropagation();
          onClick();
        }
      }}
      className={cn(
        "relative w-full text-left rounded-[16px] overflow-hidden",
        "border border-white/12 bg-white/[0.045] backdrop-blur-xl",
        // ✅ ciaśniej — mniej „pompowania”, lepsza siatka
        "p-5 md:p-6",
        "shadow-[0_18px_70px_rgba(0,0,0,0.45)]",
        "hover:shadow-[0_26px_110px_rgba(0,0,0,0.6)]",
        isClickable
          ? "cursor-pointer hover:-translate-y-[2px] transition duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#c8a04b]/40 active:translate-y-0"
          : "",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/12 via-transparent to-transparent opacity-40" />
      <div className="pointer-events-none absolute -top-20 -right-20 h-60 w-60 rounded-full bg-[#c8a04b]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-60 w-60 rounded-full bg-emerald-500/10 blur-3xl" />

      <div className="relative">
        {(title || subtitle || icon || right) && (
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                {icon ? <div className="text-[#c8a04b]/95">{icon}</div> : null}
                {title ? (
                  <div className="text-base md:text-lg font-semibold text-white/92">{title}</div>
                ) : null}
              </div>

              {subtitle ? (
                <div className="mt-1.5 text-sm leading-snug text-white/55">{subtitle}</div>
              ) : null}
            </div>

            {right ? <div className="shrink-0">{right}</div> : null}
          </div>
        )}

        {children ? <div className={cn(title || subtitle ? "mt-4" : "")}>{children}</div> : null}
      </div>
    </div>
  );
}
