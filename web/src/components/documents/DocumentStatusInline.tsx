import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DocumentStatus } from "../../types/document";

const STATUS_LABELS: Record<DocumentStatus, string> = {
  todo: "Do zrobienia",
  in_progress: "W trakcie",
  done: "Ukończone",
};

const NEXT_STATUS: Record<DocumentStatus, DocumentStatus | null> = {
  todo: "in_progress",
  in_progress: "done",
  done: null,
};

const STATUS_HELP: Record<DocumentStatus, string> = {
  todo: "Dokument nie jest jeszcze gotowy",
  in_progress: "Dokument w trakcie kompletowania",
  done: "Dokument kompletny (dodano plik)",
};

interface Props {
  status: DocumentStatus;
  onChange: (next: DocumentStatus) => void;
  disabled?: boolean;
}

export default function DocumentStatusInline({ status, onChange, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const next = NEXT_STATUS[status];
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

  const tooltipText = STATUS_HELP[status];

  return (
    <div className="relative group" ref={wrapRef}>
      <button
        type="button"
        disabled={disabled || !next}
        onClick={() => next && setOpen((v) => !v)}
        className={
  "inline-flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-medium border transition-all duration-150 " +
  (status === "done"
    ? "bg-emerald-500/15 border-emerald-400/40 text-emerald-200 hover:bg-emerald-500/25 hover:ring-1 hover:ring-emerald-400/50"
    : status === "in_progress"
      ? "bg-amber-500/15 border-amber-400/40 text-amber-200 hover:bg-amber-500/25 hover:ring-1 hover:ring-amber-400/50"
      : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10 hover:ring-1 hover:ring-white/20") +
  (disabled ? " opacity-60 cursor-not-allowed" : " hover:-translate-y-[1px] active:translate-y-0")
}

        title={next ? "Zmień status" : "To już koniec"}
      >
        {STATUS_LABELS[status]}
        {next && <ChevronDown className="w-3 h-3 opacity-60" />}
      </button>

      {/* Tooltip na hover (nie pokazujemy gdy menu otwarte) */}
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

      {open && next && (
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
