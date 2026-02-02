// CeremoDay/web/src/components/tasks/TaskStatusInline.tsx
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { TaskStatus } from "../../types/task";

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Do zrobienia",
  in_progress: "W trakcie",
  done: "Zrobione",
};

const STATUS_HELP: Record<TaskStatus, string> = {
  pending: "Zadanie nie jest jeszcze rozpoczęte",
  in_progress: "Zadanie w trakcie realizacji",
  done: "Zadanie ukończone",
};

type Props = {
  value: TaskStatus;
  onChange: (next: TaskStatus) => void;
  disabled?: boolean;
  isSaving?: boolean;
  forwardOnly?: boolean;
};

const ORDER: TaskStatus[] = ["pending", "in_progress", "done"];

function getOptions(current: TaskStatus, forwardOnly?: boolean): TaskStatus[] {
  if (!forwardOnly) return ORDER;
  const idx = ORDER.indexOf(current);
  if (idx === -1) return ORDER;
  return ORDER.slice(idx);
}

export default function TaskStatusInline({ value, onChange, disabled, isSaving, forwardOnly }: Props) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;

    const onDocClick = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (!el) return;
      if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
    };

    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const options = getOptions(value, forwardOnly);
  const canChange = options.length > 1;
  const isEffectivelyDisabled = !!disabled || !!isSaving || !canChange;

  const tooltipText = STATUS_HELP[value];

  const cls =
    "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border transition " +
    (value === "done"
      ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200"
      : value === "in_progress"
        ? "bg-amber-500/15 border-amber-400/40 text-amber-200"
        : "bg-white/5 border-white/10 text-white/70") +
    (isEffectivelyDisabled ? " opacity-60 cursor-not-allowed" : " hover:bg-white/10");

  return (
    <div className="relative group" ref={wrapRef}>
      <button
        type="button"
        disabled={isEffectivelyDisabled}
        onClick={() => canChange && setOpen((v) => !v)}
        className={cls}
        title={canChange ? "Zmień status" : "To już koniec"}
      >
        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {STATUS_LABELS[value]}
        {canChange && <ChevronDown className="w-3 h-3 opacity-60" />}
      </button>

      {/* Tooltip */}
      {!open && (
        <div
          className="
            pointer-events-none
            absolute
            bottom-full
            left-1/2
            -translate-x-1/2
            mb-2
            px-3
            py-1.5
            rounded-lg
            text-xs
            text-white
            bg-black/80
            border border-white/10
            opacity-0
            scale-95
            group-hover:opacity-100
            group-hover:scale-100
            transition
            whitespace-nowrap
            z-[60]
          "
        >
          {tooltipText}
        </div>
      )}

      {open && !isEffectivelyDisabled && (
        <div className="absolute right-0 z-[70] mt-2 rounded-xl border border-white/10 bg-[#0b1b14] shadow-xl overflow-hidden min-w-[160px]">
          {options
            .filter((s) => s !== value)
            .map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => {
                  onChange(s);
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
