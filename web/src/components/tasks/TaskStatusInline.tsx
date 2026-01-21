import { useEffect, useRef, useState } from "react";
import { ChevronDown, Loader2 } from "lucide-react";
import type { TaskStatus } from "../../types/task";

const STATUS_LABELS: Record<TaskStatus, string> = {
  pending: "Do zrobienia",
  in_progress: "W trakcie",
  done: "Zrobione",
};

const NEXT_STATUS: Record<TaskStatus, TaskStatus | null> = {
  pending: "in_progress",
  in_progress: "done",
  done: null,
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
};

export default function TaskStatusInline({ value, onChange, disabled, isSaving }: Props) {
  const [open, setOpen] = useState(false);
  const next = NEXT_STATUS[value];
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

  const isEffectivelyDisabled = !!disabled || !!isSaving || !next;
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
        onClick={() => next && setOpen((v) => !v)}
        className={cls}
        title={next ? "Zmień status" : "To już koniec"}
      >
        {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
        {STATUS_LABELS[value]}
        {next && <ChevronDown className="w-3 h-3 opacity-60" />}
      </button>

      {/* Tooltip (jak w Dokumentach) */}
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
            z-50
          "
        >
          {tooltipText}
        </div>
      )}

      {open && next && !isEffectivelyDisabled && (
        <div className="absolute right-0 z-20 mt-2 rounded-xl border border-white/10 bg-[#0b1b14] shadow-xl overflow-hidden min-w-[110px]">
          <button
            type="button"
            onClick={() => {
              onChange(next);
              setOpen(false);
            }}
            className="block w-full px-4 py-2 text-xs text-left text-white/80 hover:bg-white/10"
          >
            → {STATUS_LABELS[next]}
          </button>
        </div>
      )}
    </div>
  );
}
