// CeremoDay/web/src/components/tasks/TaskCreateEditModal.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { X, Sparkles } from "lucide-react";

import Select, { type SelectOption } from "../../ui/Select";
import DatePicker from "../../ui/DatePicker";
import FieldError from "../../ui/FieldError";
import ErrorMessage from "../../ui/ErrorMessage";

import type { Task, TaskCategory, TaskPayload } from "../../types/task";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialTask: Task | null;
  saving?: boolean;
  fieldErrors?: Record<string, string>;
  formError?: string | null;
  onClose: () => void;
  onSubmit: (payload: TaskPayload) => void;
};

const CATEGORY_LABELS: Record<TaskCategory, string> = {
  FORMALNOSCI: "Formalności",
  ORGANIZACJA: "Organizacja",
  USLUGI: "Usługi",
  DEKORACJE: "Dekoracje",
  LOGISTYKA: "Logistyka",
  DZIEN_SLUBU: "Dzień ślubu",
};

const CATEGORY_OPTIONS: SelectOption<TaskCategory>[] = [
  { value: "FORMALNOSCI", label: CATEGORY_LABELS.FORMALNOSCI },
  { value: "ORGANIZACJA", label: CATEGORY_LABELS.ORGANIZACJA },
  { value: "USLUGI", label: CATEGORY_LABELS.USLUGI },
  { value: "DEKORACJE", label: CATEGORY_LABELS.DEKORACJE },
  { value: "LOGISTYKA", label: CATEGORY_LABELS.LOGISTYKA },
  { value: "DZIEN_SLUBU", label: CATEGORY_LABELS.DZIEN_SLUBU },
];

function normalizeISODate(v?: string | null) {
  if (!v) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

const TEMPLATE = `CO I PO CO
- ...

JAK TO ZROBIC
- ...

KIEDY UZNAC ZA ZROBIONE
- ...

WSKAZOWKI
- ...
`;

export default function TaskCreateEditModal({
  open,
  mode,
  initialTask,
  saving,
  fieldErrors,
  formError,
  onClose,
  onSubmit,
}: Props) {
  const isEdit = mode === "edit";

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory | "">("");
  const [dueDate, setDueDate] = useState(""); // "YYYY-MM-DD" lub ""
  const [description, setDescription] = useState<string>("");

  const cardRef = useRef<HTMLDivElement | null>(null);

  // Scroll-lock tła + ESC (jak w dokumentach / dialogach)
  useEffect(() => {
    if (!open) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (saving) return;
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);

    // focus na kartę (żeby ESC / tab działały sensownie)
    setTimeout(() => {
      cardRef.current?.focus();
    }, 0);

    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, saving]);

  useEffect(() => {
    if (!open) return;

    setTitle(initialTask?.title ?? "");
    setCategory((initialTask?.category as TaskCategory | null) ?? "");
    setDueDate(normalizeISODate(initialTask?.due_date ?? null));
    setDescription((initialTask?.description ?? "") || "");
  }, [open, initialTask]);

  const headerTitle = isEdit ? "Edytuj zadanie" : "Dodaj zadanie";
  const headerSubtitle = isEdit
    ? "Zmień tytuł, kategorię, termin oraz notatkę."
    : "Uzupełnij dane zadania — tytuł, kategoria, termin oraz notatka (opcjonalnie).";

  const canSubmit = useMemo(() => {
    const t = title.trim();
    const tOk = t.length >= 3;
    return tOk && !saving;
  }, [title, saving]);

  if (!open) return null;

  const cardBase =
    "rounded-2xl border border-white/10 bg-[#0b1f17]/95 shadow-2xl backdrop-blur-md outline-none";

  const labelCls = "text-xs font-semibold text-white/80";
  const hintCls = "mt-1 text-xs text-white/45";

  const inputBase =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/90 " +
    "placeholder:text-white/35 outline-none transition " +
    "focus:border-[#c8a04b]/35 focus:ring-2 focus:ring-[#c8a04b]/25";

  const btnGhost =
    "inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 " +
    "px-3 py-2 text-sm text-white/80 hover:bg-white/10 transition disabled:opacity-60";

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] transition disabled:opacity-60";

  return (
    <div className="fixed inset-0 z-[90]">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/55"
        onClick={() => {
          if (saving) return;
          onClose();
        }}
        aria-hidden="true"
      />

      {/* modal (kotwica w środku + scroll wewnątrz) */}
      <div className="absolute inset-0 grid place-items-center p-4">
        <div
          ref={cardRef}
          tabIndex={-1}
          className={"w-full max-w-xl " + cardBase}
          role="dialog"
          aria-modal="true"
          aria-label={headerTitle}
        >
          {/* header */}
          <div className="flex items-start justify-between gap-3 border-b border-white/10 p-4">
            <div className="min-w-0">
              <div className="text-lg font-semibold text-white">{headerTitle}</div>
              <div className="mt-1 text-sm text-white/55">{headerSubtitle}</div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (saving) return;
                onClose();
              }}
              className="shrink-0 rounded-xl border border-white/10 bg-white/5 p-2 text-white/80 hover:bg-white/10 disabled:opacity-60"
              aria-label="Zamknij"
              disabled={!!saving}
            >
              <X size={18} />
            </button>
          </div>

          {/* body: scroll tylko wewnątrz */}
          <div className="max-h-[70vh] overflow-auto p-4 space-y-4">
            {formError ? <ErrorMessage>{formError}</ErrorMessage> : null}

            {/* Title */}
            <div>
              <div className={labelCls}>Tytuł</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputBase}
                placeholder='np. "Wybierz salę i podpisz umowę"'
                disabled={!!saving}
              />
              <FieldError message={fieldErrors?.title} />
              <div className={hintCls}>Minimum 3 znaki. Najlepiej: „moduł: konkret”.</div>
            </div>

            {/* Category + Date */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <div className={labelCls}>Kategoria</div>
                <Select
                  value={category ? String(category) : ""}
                  onChange={(v) => setCategory((v as TaskCategory) || "")}
                  options={[...CATEGORY_OPTIONS]}
                  placeholder="Wybierz kategorię"
                />
                <FieldError message={fieldErrors?.category} />
                <div className={hintCls}>Ułatwia filtrowanie i raporty.</div>
              </div>

              <div>
                <div className={labelCls}>Termin</div>
                <DatePicker
                  value={dueDate}
                  onChange={(v) => setDueDate(v)}
                  placeholder="Wybierz datę"
                  allowClear
                />
                <FieldError message={fieldErrors?.due_date} />
                <div className={hintCls}>Może być pusty — wtedy zadanie trafia do „bez terminu”.</div>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between gap-3">
                <div className={labelCls}>Notatka / opis</div>

                <button
                  type="button"
                  onClick={() => {
                    setDescription((prev) => (prev?.trim() ? prev : TEMPLATE));
                  }}
                  className={
                    "inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 " +
                    "text-xs text-white/80 hover:bg-white/10 transition"
                  }
                  title="Wstaw sekcje pomocnicze"
                  disabled={!!saving}
                >
                  <Sparkles size={14} />
                  Wstaw podpowiedzi
                </button>
              </div>

              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className={inputBase + " min-h-[120px] resize-y leading-6"}
                placeholder={
                  "Opcjonalnie. Możesz użyć sekcji:\n" +
                  "CO I PO CO / JAK TO ZROBIC / KIEDY UZNAC ZA ZROBIONE / WSKAZOWKI"
                }
                disabled={!!saving}
              />
              <FieldError message={fieldErrors?.description} />

              <div className={hintCls}>
                Tip: jeśli zaczynasz linię od „- ”, w podglądzie pojawi się lista punktowana.
              </div>
            </div>
          </div>

          {/* footer */}
          <div className="flex items-center justify-end gap-2 border-t border-white/10 p-4">
            <button
              type="button"
              onClick={() => {
                if (saving) return;
                onClose();
              }}
              className={btnGhost}
              disabled={!!saving}
            >
              Anuluj
            </button>

            <button
              type="button"
              disabled={!canSubmit}
              className={btnGold}
              onClick={() => {
                const payload: TaskPayload = {
                  title: title.trim(),
                  category: category ? (category as TaskCategory) : null,
                  due_date: dueDate ? dueDate : null,
                  description: description?.trim() ? description : null,
                };
                onSubmit(payload);
              }}
            >
              {saving ? "Zapisywanie…" : isEdit ? "Zapisz zmiany" : "Dodaj zadanie"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
