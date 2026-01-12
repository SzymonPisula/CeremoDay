import type { ReactNode } from "react";
import { cn } from "../theme/helpers";

type Action = {
  title: string;
  description: string;
  icon: ReactNode;

  // ✅ NOWE: kliknięcie całego kafla
  onClick?: () => void;

  // (opcjonalnie) mały przycisk po prawej – zostaje
  button?: ReactNode;
};

type Props = {
  title: string;
  subtitle?: string;
  actions: Action[];
  className?: string;
};

export default function HeroActionCard({ title, subtitle, actions, className }: Props) {
  return (
    <section
      className={cn(
        "relative rounded-[30px] border border-white/10 bg-white/4 backdrop-blur",
        "p-7 md:p-9 overflow-hidden",
        "shadow-[0_30px_120px_rgba(0,0,0,0.45)]",
        className
      )}
    >
      {/* 3D glow */}
      <div className="pointer-events-none absolute -top-24 -right-24 h-72 w-72 rounded-full bg-[#c8a04b]/12 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
      {/* subtle shine */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-transparent opacity-40" />

      <div className="relative flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xl md:text-2xl font-semibold text-white/92">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-white/55 max-w-2xl">{subtitle}</p> : null}
        </div>

        <div className="hidden md:block text-xs text-white/45">
          <span className="px-2 py-1 rounded-full border border-white/10 bg-white/5">
            Szybkie akcje
          </span>
        </div>
      </div>

      <div className="relative mt-7 grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
        {actions.map((a, idx) => {
          const clickable = Boolean(a.onClick);

          return (
            <button
              key={idx}
              type="button"
              onClick={a.onClick}
              disabled={!clickable}
              className={cn(
                "text-left rounded-3xl border border-white/10 bg-white/4 p-6",
                "shadow-[0_14px_50px_rgba(0,0,0,0.35)]",
                "hover:shadow-[0_22px_80px_rgba(0,0,0,0.45)] hover:-translate-y-[2px]",
                "transition",
                clickable ? "cursor-pointer" : "cursor-default opacity-90"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="text-[#c8a04b]/95">{a.icon}</div>

                {/* mały przycisk po prawej – nie przechwytuje kliknięcia kafla */}
                {a.button ? (
                  <div
                    className="shrink-0"
                    onClick={(e) => {
                      e.stopPropagation(); // ✅ nie blokuj kliknięcia kafla, ale pozwól przyciskowi działać osobno
                    }}
                  >
                    {a.button}
                  </div>
                ) : null}
              </div>

              <div className="mt-4">
                <div className="text-base font-semibold text-white/90">{a.title}</div>
                <div className="mt-1.5 text-sm text-white/55 leading-relaxed">{a.description}</div>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}
