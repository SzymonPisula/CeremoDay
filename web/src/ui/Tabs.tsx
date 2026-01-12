import { cn } from "../theme/helpers";

type Tab = { key: string; label: string; badge?: string };

type Props = {
  tabs: Tab[];
  active: string;
  onChange: (key: string) => void;
  className?: string;
};

export default function Tabs({ tabs, active, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex rounded-2xl border border-white/10 bg-white/4 backdrop-blur p-1.5",
        "shadow-[0_12px_40px_rgba(0,0,0,0.35)]",
        className
      )}
    >
      {tabs.map((t) => {
        const isActive = t.key === active;
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={cn(
              "relative inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm transition",
              isActive
                ? "bg-white/12 shadow-[0_10px_30px_rgba(0,0,0,0.35)] text-white/92"
                : "text-white/60 hover:text-white/90 hover:bg-white/6"
            )}
          >
            <span className="whitespace-nowrap">{t.label}</span>
            {t.badge ? (
              <span
                className={cn(
                  "text-[11px] px-2 py-0.5 rounded-full border",
                  isActive ? "border-white/15 bg-white/10" : "border-white/10 bg-white/5"
                )}
              >
                {t.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
