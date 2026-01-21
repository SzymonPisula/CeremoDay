import { useEffect, useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import type { Document } from "../../types/document";

interface Props {
  open: boolean;
  eventId: string;
  editing: Document | null;
  defaultPinned: boolean;
  onClose: () => void;
  onSaved: (doc: Document) => void;
}

export default function DocumentCreateEditModal({
  open,
  eventId,
  editing,
  defaultPinned,
  onClose,
  onSaved,
}: Props) {
  const isEdit = !!editing;

  const [saving, setSaving] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [holder, setHolder] = useState("");
  const [pinned, setPinned] = useState(defaultPinned);

  useEffect(() => {
    if (!open) return;

    if (editing) {
      setName(editing.name ?? "");
      setDescription(editing.description ?? "");
      setCategory(editing.category ?? "");
      setHolder(editing.holder ?? "");
      setPinned(!!editing.is_pinned);
    } else {
      setName("");
      setDescription("");
      setCategory("");
      setHolder("");
      setPinned(defaultPinned);
    }
  }, [open, editing, defaultPinned]);

  const canSave = useMemo(() => name.trim().length >= 2 && !!eventId, [name, eventId]);

  const handleSave = async () => {
    if (!canSave) return;

    try {
      setSaving(true);

      if (isEdit && editing) {
        // edycja tylko dla nie-systemowych (w Documents.tsx i tak nie pokażemy edycji systemowych)
        const updated = await api.updateDocument(editing.id, {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          category: category.trim() ? category.trim() : null,
          holder: holder.trim() ? holder.trim() : null,
          is_pinned: pinned,
        });
        onSaved(updated);
      } else {
        const created = await api.createDocument(eventId, {
          name: name.trim(),
          description: description.trim() ? description.trim() : null,
          category: category.trim() ? category.trim() : null,
          holder: holder.trim() ? holder.trim() : null,
          is_pinned: pinned,
        });
        onSaved(created);
      }
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute inset-0 p-4 grid place-items-center">
        <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0b1b14]/95 backdrop-blur-md shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
            <div>
              <div className="text-white font-semibold">
                {isEdit ? "Edytuj dokument" : "Dodaj dokument"}
              </div>
              <div className="text-xs text-white/60">
                {isEdit ? "Zmień dane dokumentu." : "Utwórz własny dokument dla wydarzenia."}
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-2 border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
              title="Zamknij"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            <div>
              <label className="block text-xs text-white/60 mb-1">Nazwa</label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#c8a04b]/50"
                placeholder="np. Umowa z fotografem"
              />
            </div>

            <div>
              <label className="block text-xs text-white/60 mb-1">Opis</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full min-h-[90px] rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#c8a04b]/50"
                placeholder="Krótka notatka co to jest i kiedy ma być gotowe…"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-white/60 mb-1">Kategoria</label>
                <input
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#c8a04b]/50"
                  placeholder="np. USC / Kościół / Umowy"
                />
              </div>

              <div>
                <label className="block text-xs text-white/60 mb-1">Kto</label>
                <input
                  value={holder}
                  onChange={(e) => setHolder(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/25 px-3 py-2 text-sm text-white outline-none focus:border-[#c8a04b]/50"
                  placeholder="bride / groom / both (opcjonalnie)"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-white/70 select-none">
              <input
                type="checkbox"
                checked={pinned}
                onChange={(e) => setPinned(e.target.checked)}
              />
              Dodaj do głównych
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-4 py-2 text-sm border border-white/10 bg-white/5 text-white/70 hover:text-white hover:bg-white/10"
            >
              Anuluj
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || saving}
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              Zapisz
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
