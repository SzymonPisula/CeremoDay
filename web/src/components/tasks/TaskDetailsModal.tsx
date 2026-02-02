// CeremoDay/web/src/components/tasks/TaskDetailsModal.tsx
import { useEffect, useMemo, useRef } from "react";
import { X, Pencil, Trash2 } from "lucide-react";
import type { Task, TaskCategory, TaskStatus } from "../../types/task";

export type TaskLike = Pick<Task, "id" | "title" | "status" | "category" | "due_date"> & {
  description?: string | null; // UWAGA: może być undefined w Task
};

type Props = {
  open: boolean;
  task: TaskLike | null;
  onClose: () => void;
  onEdit: (t: TaskLike) => void;
  onDelete: (t: TaskLike) => void;
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  FORMALNOSCI: "Formalności",
  ORGANIZACJA: "Organizacja",
  USLUGI: "Usługi",
  DEKORACJE: "Dekoracje",
  LOGISTYKA: "Logistyka",
  DZIEN_SLUBU: "Dzień ślubu",
};

function formatStatus(s: TaskStatus) {
  if (s === "pending") return "Do zrobienia";
  if (s === "in_progress") return "W trakcie";
  return "Zrobione";
}

function formatDate(v: string | null | undefined) {
  if (!v) return "Brak";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return v;
  return d.toLocaleDateString("pl-PL", { year: "numeric", month: "short", day: "2-digit" });
}

function splitDescription(desc: string) {
  const lines = desc.split("\n").map((l) => l.trim());
  const blocks: Array<{ type: "h" | "p" | "li"; text: string }> = [];

  const headings = new Set(["CO I PO CO", "JAK TO ZROBIC", "KIEDY UZNAC ZA ZROBIONE", "WSKAZOWKI"]);

  for (const line of lines) {
    if (!line) continue;

    if (headings.has(line)) {
      blocks.push({ type: "h", text: line });
      continue;
    }

    if (line.startsWith("- ")) {
      blocks.push({ type: "li", text: line.slice(2).trim() });
      continue;
    }

    blocks.push({ type: "p", text: line });
  }

  return blocks;
}

export default function TaskDetailsModal({ open, task, onClose, onEdit, onDelete }: Props) {
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Scroll-lock tła + ESC
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);

    setTimeout(() => {
      cardRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  const description = task?.description ?? null;

  const blocks = useMemo(() => {
    if (!description) return [];
    return splitDescription(description);
  }, [description]);

  if (!open || !task) return null;

  const catLabel =
    task.category && CATEGORY_LABELS[task.category as TaskCategory]
      ? CATEGORY_LABELS[task.category as TaskCategory]
      : task.category ?? "Brak";

  const btnGhost =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 " +
    "px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition";

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] transition";

  const btnDanger =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-red-400/25 bg-red-500/10 " +
    "px-3 py-2 text-sm font-semibold text-red-100 hover:bg-red-500/15 transition";

  return (
    <div className="fixed inset-0 z-[80]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />

      {/* modal */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          ref={cardRef}
          tabIndex={-1}
          className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b1f17]/95 shadow-2xl outline-none"
          role="dialog"
          aria-modal="true"
          aria-label="Szczegóły zadania"
        >
          {/* header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div className="min-w-0">
              <div className="text-xs text-white/60">Szczegóły zadania</div>
              <div className="mt-1 truncate text-lg font-semibold text-white">{task.title}</div>

              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/80">
                  Status: {formatStatus(task.status)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/80">
                  Termin: {formatDate(task.due_date)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-white/80">
                  Kategoria: {catLabel}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10"
              aria-label="Zamknij"
            >
              <X size={18} />
            </button>
          </div>

          {/* body */}
          <div className="max-h-[70vh] overflow-auto p-4">
            {!description ? (
              <div className="text-sm text-white/70">Brak opisu.</div>
            ) : (
              <div className="space-y-2">
                {blocks.map((b, idx) => {
                  if (b.type === "h") {
                    return (
                      <div key={idx} className="mt-3 text-sm font-semibold text-white">
                        {b.text}
                      </div>
                    );
                  }
                  if (b.type === "li") {
                    return (
                      <div key={idx} className="flex gap-2 text-sm text-white/80">
                        <div className="mt-[7px] h-[5px] w-[5px] rounded-full bg-white/50" />
                        <div className="min-w-0">{b.text}</div>
                      </div>
                    );
                  }
                  return (
                    <div key={idx} className="text-sm leading-6 text-white/80">
                      {b.text}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* footer */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-2 border-t border-white/10 p-4">
            <button type="button" onClick={() => onDelete(task)} className={btnDanger} title="Usuń zadanie">
              <Trash2 className="w-4 h-4" />
              Usuń
            </button>

            <button type="button" onClick={() => onEdit(task)} className={btnGold} title="Edytuj zadanie">
              <Pencil className="w-4 h-4" />
              Edytuj
            </button>

            <button type="button" onClick={onClose} className={btnGhost}>
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
