import type { ReactNode } from "react";
import { cn } from "../theme/helpers";

type Props = {
  title: string;
  value: ReactNode;
  hint?: string;
  icon?: ReactNode;
  onClick?: () => void;
  className?: string;
};

export default function StatCard({ title, value, hint, icon, onClick, className }: Props) {
  const clickable = typeof onClick === "function";

  return (
    <div
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={onClick}
      onKeyDown={(e) => {
        if (!clickable) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      className={cn(
        "cd-card p-6 sm:p-7 transition-[transform,filter] duration-200",
        clickable && "cursor-pointer hover:brightness-105 hover:-translate-y-[1px]",
        className
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-medium tracking-wide text-[rgba(245,246,248,0.60)]">
            {title}
          </div>
          <div className="mt-2 text-3xl font-semibold tracking-tight text-[rgba(245,246,248,0.96)]">
            {value}
          </div>
          {hint ? (
            <div className="mt-3 text-sm text-[rgba(245,246,248,0.66)]">{hint}</div>
          ) : null}
        </div>

        {icon ? (
          <div className="shrink-0 rounded-2xl border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.05)] p-3">
            {icon}
          </div>
        ) : null}
      </div>
    </div>
  );
}
