import { useEffect, useMemo, useState } from "react";
import { Loader2, X } from "lucide-react";

import Select, { type SelectOption } from "../../ui/Select";
import DatePicker from "../../ui/DatePicker";
import Textarea from "../../ui/Textarea";

import type { Task, TaskCategory, TaskPayload } from "../../types/task";

type Props = {
  open: boolean;
  mode: "create" | "edit";
  initialTask?: Task | null;

  saving?: boolean;

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

const CATEGORY_KEYS: readonly TaskCategory[] = [
  "FORMALNOSCI",
  "ORGANIZACJA",
  "USLUGI",
  "DEKORACJE",
  "LOGISTYKA",
  "DZIEN_SLUBU",
] as const;

export default function TaskCreateEditModal({
  open,
  mode,
  initialTask,
  saving,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<TaskCategory>("FORMALNOSCI");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState<string>("");

  useEffect(() => {
    if (!open) return;

    if (mode === "edit" && initialTask) {
      setTitle(initialTask.title || "");
      setCategory(initialTask.category || "FORMALNOSCI");
      setDescription(initialTask.description || "");
      setDueDate(initialTask.due_date || "");
    } else {
      setTitle("");
      setCategory("FORMALNOSCI");
      setDescription("");
      setDueDate("");
    }
  }, [open, mode, initialTask]);

  const titleText = mode === "create" ? "Dodaj zadanie" : "Edytuj zadanie";

  const categoryOptions: readonly SelectOption<TaskCategory>[] = useMemo(
  () =>
    CATEGORY_KEYS.map((k) => ({
      value: k,
      label: CATEGORY_LABELS[k],
    })),
  []
);

  if (!open) return null;

  const inputBase =
    "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/35 " +
    "outline-none focus:border-[#c8a04b]/50 focus:ring-2 focus:ring-[#c8a04b]/15 transition";

  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.55)]";

  const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
    "bg-white/5 text-white border border-white/10 " +
    "hover:bg-white/10 hover:border-white/15 " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40 transition disabled:opacity-60";

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/45 transition disabled:opacity-60";

  const submit = () => {
    if (!title.trim()) return;

    const payload: TaskPayload = {
      title: title.trim(),
      category,
      description: description ? description : undefined,
      due_date: dueDate || undefined,
      status: mode === "edit" && initialTask ? initialTask.status : "pending",
    };

    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* modal */}
      <div className="relative w-full max-w-2xl mx-auto px-4">
        <div className={cardBase + " p-6 md:p-7"}>
          <div className="flex items-start justify-between gap-3 mb-5">
            <div>
              <h3 className="text-white font-bold text-xl">{titleText}</h3>
              <p className="text-sm text-white/60">
                Uzupełnij dane zadania – tytuł, kategoria, termin i notatkę.
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-white hover:bg-white/10 transition"
              title="Zamknij"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <div className="text-white font-semibold mb-2">Tytuł</div>
              <input
                className={inputBase}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Np. Umowa z DJ-em"
              />
            </div>

            <div>
              <div className="text-white font-semibold mb-2">Kategoria</div>
              <Select<TaskCategory>
                value={category}
                onChange={(v) => setCategory(v)}
                options={categoryOptions}
              />
            </div>

            <div>
              <div className="text-white font-semibold mb-2">Termin</div>
              <DatePicker
                value={dueDate}
                onChange={setDueDate}
                placeholder="Termin"
                className="w-full"
                buttonClassName="py-2 text-sm"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-white font-semibold mb-2">Notatka / opis</div>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Dodatkowe informacje, linki, ustalenia…"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-5 mt-5 border-t border-white/10">
            <button type="button" className={btnSecondary} onClick={onClose} disabled={saving}>
              Anuluj
            </button>
            <button type="button" className={btnGold} onClick={submit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Zapisywanie…
                </>
              ) : mode === "create" ? (
                "Dodaj zadanie"
              ) : (
                "Zapisz zmiany"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
