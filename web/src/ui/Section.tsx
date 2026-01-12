import type { ReactNode } from "react";
import { cn } from "../theme/helpers";

type Props = {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
};

export default function Section({ title, subtitle, icon, right, children, className }: Props) {
  return (
    <section
      className={cn(
        "relative rounded-[30px] border border-white/10 bg-white/4 backdrop-blur",
        "p-7 md:p-9 overflow-hidden",
        "shadow-[0_30px_120px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {/* glow + shine */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#c8a04b]/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-35" />

      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3">
            {icon ? <div className="text-[#c8a04b]/95">{icon}</div> : null}
            <h2 className="text-xl md:text-2xl font-semibold text-white/92">{title}</h2>
          </div>
          {subtitle ? <p className="mt-2 text-sm text-white/55 max-w-3xl">{subtitle}</p> : null}
        </div>

        {right ? <div className="relative">{right}</div> : null}
      </div>

      <div className="relative mt-7">{children}</div>
    </section>
  );
}
