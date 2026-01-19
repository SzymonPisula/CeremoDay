// /CeremoDay/web/src/pages/Inspiration.tsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import {
  Image as ImageIcon,
  Plus,
  Sparkles,
  Loader2,
  Trash2,
  Search,
  Pencil,
  X,
} from "lucide-react";
import { api, BASE_URL } from "../lib/api";
import Select from "../ui/Select";
import type {
  InspirationBoard,
  InspirationItem,
  InspirationCategory,
  InspirationBoardPayload,
  InspirationItemPayload,
} from "../types/inspiration";
import PreviewModal from "../components/preview/PreviewModal";

type Params = { id: string };

const CATEGORY_LABELS: Record<InspirationCategory, string> = {
  DEKORACJE: "Dekoracje",
  KWIATY: "Kwiaty",
  STROJE: "Stroje",
  PAPETERIA: "Papeteria",
  INNE: "Inne",
};

const CATEGORY_OPTIONS = ([
  { value: "DEKORACJE", label: "Dekoracje" },
  { value: "KWIATY", label: "Kwiaty" },
  { value: "STROJE", label: "Stroje" },
  { value: "PAPETERIA", label: "Papeteria" },
  { value: "INNE", label: "Inne" },
] as const) satisfies ReadonlyArray<{ value: InspirationCategory; label: string }>;

const FILTER_CATEGORY_OPTIONS = ([
  { value: "all", label: "Wszystkie kategorie" },
  { value: "DEKORACJE", label: "Dekoracje" },
  { value: "KWIATY", label: "Kwiaty" },
  { value: "STROJE", label: "Stroje" },
  { value: "PAPETERIA", label: "Papeteria" },
  { value: "INNE", label: "Inne" },
] as const) satisfies ReadonlyArray<{
  value: "all" | InspirationCategory;
  label: string;
}>;

// ===== Modal (spójny, jak w Gościach) =====
const Modal: React.FC<{
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}> = ({ onClose, title, children }) => {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKey);

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  if (typeof document === "undefined") return null;

  const modalRoot =
    document.getElementById("modal-root") ||
    (() => {
      const div = document.createElement("div");
      div.id = "modal-root";
      document.body.appendChild(div);
      return div;
    })();

  return createPortal(
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(3px)" }}
    >
      {/* overlay */}
      <div onClick={onClose} className="absolute inset-0 cursor-pointer" />

      {/* content */}
      <div className="relative w-full max-w-2xl p-6 overflow-y-auto max-h-[90vh] rounded-2xl shadow-2xl border border-white/10 bg-emerald-950/70 text-white backdrop-blur-xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title ? <h3 className="text-xl font-semibold text-white">{title}</h3> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-white/5 p-2 hover:bg-white/10 transition"
            title="Zamknij"
          >
            <X className="w-4 h-4 text-white/80" />
          </button>
        </div>

        {children}
      </div>
    </div>,
    modalRoot
  );
};

export default function Inspiration() {
  const { id: eventId } = useParams<Params>();

  const [boards, setBoards] = useState<InspirationBoard[]>([]);
  const [selectedBoardId, setSelectedBoardId] = useState<string | null>(null);
  const [items, setItems] = useState<InspirationItem[]>([]);

  const [loadingBoards, setLoadingBoards] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // formularz tworzenia tablicy
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardDescription, setNewBoardDescription] = useState("");

  // formularz tworzenia inspiracji
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemCategory, setNewItemCategory] = useState<InspirationCategory>("DEKORACJE");
  const [newItemTags, setNewItemTags] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);

  // filtrowanie
  const [categoryFilter, setCategoryFilter] = useState<InspirationCategory | "all">("all");
  const [searchFilter, setSearchFilter] = useState("");

  // ===== Edycja tablicy =====
  const [editingBoard, setEditingBoard] = useState<InspirationBoard | null>(null);
  const [editBoardName, setEditBoardName] = useState("");
  const [editBoardDescription, setEditBoardDescription] = useState("");

  // ===== Edycja inspiracji =====
  const [editingItem, setEditingItem] = useState<InspirationItem | null>(null);
  const [editItemTitle, setEditItemTitle] = useState("");
  const [editItemCategory, setEditItemCategory] = useState<InspirationCategory>("DEKORACJE");
  const [editItemTags, setEditItemTags] = useState("");
  const [editItemDescription, setEditItemDescription] = useState("");

  // UI helpers — spójne z resztą “CRM vibe”
  const inputBase =
    "w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-white placeholder:text-white/35 " +
    "outline-none focus:border-[#c8a04b]/50 focus:ring-2 focus:ring-[#c8a04b]/15 transition";

  const textareaBase = inputBase + " min-h-[96px] resize-y";

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/45 " +
    "transition disabled:opacity-60";

  const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
    "bg-white/5 text-white border border-white/10 " +
    "hover:bg-white/10 hover:border-white/15 " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40 " +
    "transition";


  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";

  const chip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full " +
    "border border-white/10 bg-white/5 text-white/80 text-xs";

  // === Fetch: tablice ===
  useEffect(() => {
    if (!eventId) return;

    const fetchBoards = async () => {
      try {
        setLoadingBoards(true);
        setError(null);

        const data = await api.getInspirationBoards(eventId);
        setBoards(data);

        setSelectedBoardId((prev) => {
          if (prev) return prev;
          return data.length > 0 ? data[0].id : null;
        });
      } catch (err) {
        console.error("❌ Błąd pobierania tablic inspiracji:", err);
        setError("Nie udało się pobrać tablic inspiracji");
      } finally {
        setLoadingBoards(false);
      }
    };

    fetchBoards();
  }, [eventId]);

  // === Fetch: elementy tablicy ===
  useEffect(() => {
    if (!selectedBoardId) {
      setItems([]);
      return;
    }

    const fetchItems = async () => {
      try {
        setLoadingItems(true);
        setError(null);
        const data = await api.getInspirationItems(selectedBoardId);
        setItems(data);
      } catch (err) {
        console.error("❌ Błąd pobierania inspiracji:", err);
        setError("Nie udało się pobrać inspiracji");
      } finally {
        setLoadingItems(false);
      }
    };

    fetchItems();
  }, [selectedBoardId]);

  const selectedBoard = useMemo(
    () => boards.find((b) => b.id === selectedBoardId) || null,
    [boards, selectedBoardId]
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (categoryFilter !== "all" && item.category !== categoryFilter) return false;
      const q = searchFilter.trim().toLowerCase();
      if (!q) return true;
      const text = [item.title, item.description || "", item.tags || ""].join(" ").toLowerCase();
      return text.includes(q);
    });
  }, [items, categoryFilter, searchFilter]);

  const handleCreateBoard = async () => {
    if (!eventId) return;
    if (!newBoardName.trim()) {
      alert("Podaj nazwę tablicy");
      return;
    }

    const payload: InspirationBoardPayload = {
      name: newBoardName.trim(),
      description: newBoardDescription.trim() || null,
    };

    try {
      setSaving(true);
      setError(null);
      const created = await api.createInspirationBoard(eventId, payload);
      setBoards((prev) => [...prev, created]);
      setNewBoardName("");
      setNewBoardDescription("");
      setSelectedBoardId((prev) => prev ?? created.id);
    } catch (err) {
      console.error("❌ Błąd tworzenia tablicy inspiracji:", err);
      setError("Nie udało się utworzyć tablicy");
    } finally {
      setSaving(false);
    }
  };

  const openEditBoard = (b: InspirationBoard) => {
    setEditingBoard(b);
    setEditBoardName(b.name ?? "");
    setEditBoardDescription(b.description ?? "");
  };

  const handleSaveBoardEdit = async () => {
    if (!editingBoard) return;
    const name = editBoardName.trim();
    if (!name) {
      alert("Nazwa tablicy nie może być pusta");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const updated = await api.updateInspirationBoard(editingBoard.id, {
        name,
        description: editBoardDescription.trim() || null,
      });

      setBoards((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditingBoard(null);
    } catch (err) {
      console.error("❌ Błąd edycji tablicy:", err);
      setError("Nie udało się zapisać zmian tablicy");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoard = async (board: InspirationBoard) => {
    if (!window.confirm(`Na pewno chcesz usunąć tablicę "${board.name}"?`)) return;

    try {
      setSaving(true);
      await api.deleteInspirationBoard(board.id);
      setBoards((prev) => prev.filter((b) => b.id !== board.id));

      if (selectedBoardId === board.id) {
        setSelectedBoardId((prevSelected) => {
          if (prevSelected !== board.id) return prevSelected;
          const remaining = boards.filter((b) => b.id !== board.id);
          return remaining.length ? remaining[0].id : null;
        });
        setItems([]);
      }
    } catch (err) {
      console.error("❌ Błąd usuwania tablicy:", err);
      setError("Nie udało się usunąć tablicy");
    } finally {
      setSaving(false);
    }
  };

  const handleCreateItem = async () => {
    if (!selectedBoardId) {
      alert("Najpierw wybierz tablicę");
      return;
    }
    if (!newItemTitle.trim()) {
      alert("Podaj tytuł inspiracji");
      return;
    }

    const payload: InspirationItemPayload = {
      title: newItemTitle.trim(),
      description: newItemDescription.trim() || null,
      category: newItemCategory,
      tags: newItemTags.trim() || null,
    };

    try {
      setSaving(true);
      setError(null);

      // 1) tworzymy rekord
      const created = await api.createInspirationItem(selectedBoardId, payload);

      // 2) jeśli user wybrał plik -> upload od razu
      let finalItem = created;
      if (newFile) {
        finalItem = await api.uploadInspirationImage(created.id, newFile);
      }

      setItems((prev) => [...prev, finalItem]);

      // reset form
      setNewItemTitle("");
      setNewItemDescription("");
      setNewItemTags("");
      setNewItemCategory("DEKORACJE");
      setNewFile(null);
    } catch (err) {
      console.error("❌ Błąd tworzenia inspiracji:", err);
      setError("Nie udało się dodać inspiracji");
    } finally {
      setSaving(false);
    }
  };

  const openEditItem = (it: InspirationItem) => {
    setEditingItem(it);
    setEditItemTitle(it.title ?? "");
    setEditItemCategory(it.category ?? "DEKORACJE");
    setEditItemTags(it.tags ?? "");
    setEditItemDescription(it.description ?? "");
  };

  const handleSaveItemEdit = async () => {
    if (!editingItem) return;
    const title = editItemTitle.trim();
    if (!title) {
      alert("Tytuł nie może być pusty");
      return;
    }

    const payload: Partial<InspirationItemPayload> = {
      title,
      category: editItemCategory,
      tags: editItemTags.trim() || null,
      description: editItemDescription.trim() || null,
    };

    try {
      setSaving(true);
      setError(null);
      const updated = await api.updateInspirationItem(editingItem.id, payload);
      setItems((prev) => prev.map((x) => (x.id === updated.id ? updated : x)));
      setEditingItem(null);
    } catch (err) {
      console.error("❌ Błąd edycji inspiracji:", err);
      setError("Nie udało się zapisać zmian inspiracji");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item: InspirationItem) => {
    if (!window.confirm(`Na pewno chcesz usunąć inspirację "${item.title}"?`)) return;

    try {
      setSaving(true);
      await api.deleteInspirationItem(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
    } catch (err) {
      console.error("❌ Błąd usuwania inspiracji:", err);
      setError("Nie udało się usunąć inspiracji");
    } finally {
      setSaving(false);
    }
  };

  const handleUploadImage = async (item: InspirationItem, file: File | null | undefined) => {
    if (!file) return;
    try {
      setSaving(true);
      setError(null);
      const updated = await api.uploadInspirationImage(item.id, file);
      setItems((prev) => prev.map((i) => (i.id === item.id ? updated : i)));
    } catch (err) {
      console.error("❌ Błąd uploadu pliku inspiracji:", err);
      setError("Nie udało się wgrać pliku");
    } finally {
      setSaving(false);
    }
  };
const [preview, setPreview] = useState<{ open: boolean; url: string; title?: string } | null>(null);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center" aria-hidden>
            <Sparkles className="w-5 h-5 text-[#d7b45a]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">Inspiracje</h2>
            <p className="text-sm text-white/60">
              Tablice + inspiracje z obrazkami, kategoriami i tagami — w spójnym stylu CeremoDay.
            </p>
          </div>
        </div>

        <div className="text-xs text-white/50">
          {loadingBoards ? (
            <span className="inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Ładowanie tablic…
            </span>
          ) : (
            <span className={chip}>Tablice: {boards.length}</span>
          )}
        </div>
      </div>

      {error && (
        <div className={`${cardBase} p-4 mb-4 border-red-500/20 bg-red-500/10`}>
          <p className="text-sm text-red-200">{error}</p>
        </div>
      )}

      {/* Tablice */}
      <div className={`${cardBase} p-6 md:p-7 mb-6`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-white font-semibold">Tablice inspiracji</h3>
          {saving && (
            <span className="text-xs text-white/55 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Zapisywanie…
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {boards.map((board) => {
            const isActive = board.id === selectedBoardId;

            return (
              <div
                key={board.id}
                role="button"
                tabIndex={0}
                onClick={() => setSelectedBoardId(board.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") setSelectedBoardId(board.id);
                }}
                className={
                  "relative cursor-pointer rounded-2xl border p-4 text-left transition select-none " +
                  (isActive
                    ? "border-[#c8a04b]/40 bg-[#c8a04b]/10 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
                    : "border-white/10 bg-white/5 hover:bg-white/7")
                }
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-lg">{board.emoji ?? "✨"}</span>
                      <div className="font-semibold text-white truncate">{board.name}</div>
                    </div>
                    {board.description && (
                      <div className="text-xs text-white/55 line-clamp-2">{board.description}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEditBoard(board);
                      }}
                      className="inline-flex items-center gap-2 text-xs text-white/55 hover:text-white/85"
                      title="Edytuj tablicę"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBoard(board);
                      }}
                      className="inline-flex items-center gap-2 text-xs text-white/55 hover:text-red-200"
                      title="Usuń tablicę"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {isActive && (
                  <div className="mt-3">
                    <span className="text-[11px] text-[#d7b45a]">Aktywna</span>
                  </div>
                )}
              </div>
            );
          })}

          {/* Karta dodania nowej tablicy */}
          <div className="rounded-2xl border border-dashed border-white/15 bg-white/3 p-4">
            <div className="text-sm font-semibold text-white mb-2">Nowa tablica</div>
            <div className="space-y-2">
              <input
                type="text"
                placeholder="Nazwa tablicy…"
                value={newBoardName}
                onChange={(e) => setNewBoardName(e.target.value)}
                className={inputBase}
              />
              <textarea
                placeholder="Krótki opis (opcjonalnie)…"
                value={newBoardDescription}
                onChange={(e) => setNewBoardDescription(e.target.value)}
                className={textareaBase}
              />
              <button type="button" onClick={handleCreateBoard} disabled={saving} className={btnGold + " w-full"}>
                <Plus className="w-4 h-4" />
                Dodaj tablicę
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Wybrana tablica + filtry + dodawanie */}
      {selectedBoard ? (
        <div className={`${cardBase} p-6 md:p-7`}>
          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-4">
            <div>
              <h3 className="text-white font-semibold">
                Tablica: <span className="text-[#d7b45a]">{selectedBoard.name}</span>
              </h3>
              {selectedBoard.description && (
                <p className="text-sm text-white/55 mt-1">{selectedBoard.description}</p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <div className="min-w-[240px]">
                <Select
                  label="Kategoria"
                  value={categoryFilter}
                  onChange={(v) => setCategoryFilter(v as InspirationCategory | "all")}
                  options={FILTER_CATEGORY_OPTIONS}
                />
              </div>

              <div className="relative">
                <Search className="w-4 h-4 text-white/35 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Szukaj po tytule/tagach…"
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className={inputBase + " pl-9 min-w-[240px]"}
                />
              </div>
            </div>
          </div>

          {loadingItems && (
            <div className="text-xs text-white/55 mb-3 inline-flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Ładowanie inspiracji…
            </div>
          )}

          {/* Dodaj inspirację */}
          <div className="rounded-2xl border border-white/10 bg-white/4 p-5 mb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
                <ImageIcon className="w-4 h-4 text-[#d7b45a]" />
              </div>
              <div>
                <div className="text-white font-semibold">Dodaj inspirację</div>
                <div className="text-xs text-white/55">
                  Tytuł, kategoria, tagi + opis. Plik możesz dodać od razu.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 space-y-3">
                <input
                  type="text"
                  placeholder="Tytuł inspiracji…"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  className={inputBase}
                />
                <textarea
                  placeholder="Opis / notatki (opcjonalnie)…"
                  value={newItemDescription}
                  onChange={(e) => setNewItemDescription(e.target.value)}
                  className={textareaBase}
                />
              </div>

              <div className="space-y-3">
                <Select
                  label="Kategoria"
                  value={newItemCategory}
                  onChange={(v) => setNewItemCategory(v as InspirationCategory)}
                  options={CATEGORY_OPTIONS}
                />

                <input
                  type="text"
                  placeholder="Tagi (np. rustykalny, boho)…"
                  value={newItemTags}
                  onChange={(e) => setNewItemTags(e.target.value)}
                  className={inputBase}
                />
              </div>

              <div className="space-y-3">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-white/55 mb-1">
                    Plik (zdjęcie lub PDF)
                  </div>

                  <div className="flex items-center gap-3">
                    <label
                      className="inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold
                                bg-white/5 text-white border border-white/10
                                hover:bg-white/8 hover:border-white/15 cursor-pointer transition"
                    >
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={(e) => setNewFile(e.target.files?.[0] ?? null)}
                      />
                      + Dodaj plik
                    </label>

                    <div className="text-sm text-white/70 truncate">
                      {newFile ? (
                        <span className="text-white/85">{newFile.name}</span>
                      ) : (
                        <span className="text-white/45">Nie wybrano pliku</span>
                      )}
                    </div>

                    {newFile ? (
                      <button
                        type="button"
                        onClick={() => setNewFile(null)}
                        className="text-xs text-white/55 hover:text-white/80 transition"
                      >
                        Wyczyść
                      </button>
                    ) : null}
                  </div>
                </div>

                <button type="button" onClick={handleCreateItem} disabled={saving} className={btnGold + " w-full"}>
                  <Plus className="w-4 h-4" />
                  Dodaj inspirację
                </button>
              </div>
            </div>
          </div>

          {/* Grid inspiracji */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {filteredItems.map((item) => (
              <div key={item.id} className={cardBase + " overflow-hidden"}>
                <div className="relative">
                  {item.image_url ? (
                    <img
                      src={`${BASE_URL}${item.image_url}`}
                      alt={item.title}
                      className="w-full h-44 object-cover"
                    />
                    
                  ) : (
                    <div className="w-full h-44 flex items-center justify-center bg-black/20 text-white/45 text-xs">
                      Brak obrazka
                    </div>
                  )}
                  {item.image_url ? (
                    <button
                      type="button"
                      onClick={() => {
                        const url = item.image_url;
                        if (!url) return;
                        setPreview({ open: true, url, title: item.title });
                      }}
                      className="absolute top-2 left-2 rounded-full border border-white/15 bg-black/35 backdrop-blur px-3 py-1.5 text-xs text-white hover:bg-black/45 transition"
                    >
                      Podgląd
                    </button>
                  ) : null}
                  <label className="absolute bottom-2 right-2 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/35 backdrop-blur px-3 py-1.5 cursor-pointer text-xs text-white hover:bg-black/45 transition">
                    <ImageIcon className="w-4 h-4 text-[#d7b45a]" />
                    <span>Dodaj / zmień</span>
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={(e) => handleUploadImage(item, e.target.files?.[0])}
                    />
                  </label>
                </div>

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="min-w-0">
                      <div className="font-semibold text-white truncate">{item.title}</div>
                      <div className="mt-1 flex flex-wrap gap-2">
                        {item.category ? <span className={chip}>{CATEGORY_LABELS[item.category]}</span> : null}
                        {item.tags ? <span className={chip}>{item.tags}</span> : null}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditItem(item)}
                        className="text-xs text-white/55 hover:text-white/85 inline-flex items-center gap-1"
                        title="Edytuj"
                      >
                        <Pencil className="w-4 h-4" />
                        Edytuj
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        className="text-xs text-white/55 hover:text-red-200"
                        title="Usuń"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>

                  {item.description ? (
                    <p className="text-sm text-white/60 leading-relaxed line-clamp-3">{item.description}</p>
                  ) : null}
                </div>
              </div>
            ))}
          </div>

          {filteredItems.length === 0 && !loadingItems && (
            <p className="mt-4 text-sm text-white/55">
              Brak inspiracji na tej tablicy. Dodaj pierwszą powyżej.
            </p>
          )}
        </div>
      ) : (
        <div className={`${cardBase} p-6 md:p-7`}>
          <p className="text-sm text-white/60">
            Brak wybranej tablicy. Dodaj tablicę powyżej, aby rozpocząć.
          </p>
        </div>
      )}

      {/* ===== MODAL: Edycja tablicy ===== */}
      {editingBoard ? (
        <Modal onClose={() => setEditingBoard(null)} title="Edytuj tablicę">
          <div className="space-y-3">
            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/55 mb-1">Nazwa</div>
              <input
                value={editBoardName}
                onChange={(e) => setEditBoardName(e.target.value)}
                className={inputBase}
                placeholder="Nazwa tablicy…"
              />
            </div>

            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/55 mb-1">Opis (opcjonalnie)</div>
              <textarea
                value={editBoardDescription}
                onChange={(e) => setEditBoardDescription(e.target.value)}
                className={textareaBase}
                placeholder="Opis…"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingBoard(null)} className={btnSecondary}>
                Anuluj
              </button>
              <button type="button" onClick={handleSaveBoardEdit} className={btnGold} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Zapisz
              </button>
            </div>
          </div>
        </Modal>
      ) : null}

      {/* ===== MODAL: Edycja inspiracji ===== */}
      {editingItem ? (
        <Modal onClose={() => setEditingItem(null)} title="Edytuj inspirację">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-wider text-white/55 mb-1">Tytuł</div>
              <input
                value={editItemTitle}
                onChange={(e) => setEditItemTitle(e.target.value)}
                className={inputBase}
                placeholder="Tytuł…"
              />
            </div>

            <Select
              label="Kategoria"
              value={editItemCategory}
              onChange={(v) => setEditItemCategory(v as InspirationCategory)}
              options={CATEGORY_OPTIONS}
            />

            <div>
              <div className="text-[11px] uppercase tracking-wider text-white/55 mb-1">Tagi</div>
              <input
                value={editItemTags}
                onChange={(e) => setEditItemTags(e.target.value)}
                className={inputBase}
                placeholder="np. boho, rustykalny…"
              />
            </div>

            <div className="md:col-span-2">
              <div className="text-[11px] uppercase tracking-wider text-white/55 mb-1">Opis</div>
              <textarea
                value={editItemDescription}
                onChange={(e) => setEditItemDescription(e.target.value)}
                className={textareaBase}
                placeholder="Opis / notatki…"
              />
            </div>

            <div className="md:col-span-2 flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setEditingItem(null)} className={btnSecondary}>
                Anuluj
              </button>
              <button type="button" onClick={handleSaveItemEdit} className={btnGold} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Zapisz
              </button>
            </div>
          </div>
        </Modal>
      ) : null}
      <PreviewModal
  open={!!preview?.open}
  onClose={() => setPreview(null)}
  title={preview?.title}
  url={preview?.url ?? ""}
  baseUrl={BASE_URL}
/>
    </div>
    
  );
  
}
