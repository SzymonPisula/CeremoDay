import { X } from "lucide-react";
import type { Task, TaskStatus } from "../../types/task";

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

export default function TaskDetailsModal({ open, task, onClose }: Props) {
  if (!open || !task) return null;

  const description = task.description ?? null;
  const blocks = description ? splitDescription(description) : [];

  return (
    <div className="fixed inset-0 z-[80]">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/55" onClick={onClose} aria-hidden="true" />

      {/* modal */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-[#0b1f17]/95 shadow-2xl">
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
                  Kategoria: {task.category ?? "Brak"}
                </span>
              </div>
            </div>

            <button
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
          <div className="flex items-center justify-end gap-2 border-t border-white/10 p-4">
            

            <button
              onClick={onClose}
              className="rounded-xl bg-white/90 px-3 py-2 text-sm font-semibold text-[#0b1f17] hover:bg-white"
            >
              Zamknij
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
