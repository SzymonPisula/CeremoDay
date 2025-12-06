// CeremoDay/web/src/pages/Inspiration.tsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Image as ImageIcon,
  Plus,
  Sparkles,
  Loader2,
} from "lucide-react";
import { api, BASE_URL } from "../lib/api";
import type {
  InspirationBoard,
  InspirationItem,
  InspirationCategory,
  InspirationBoardPayload,
  InspirationItemPayload,
} from "../types/inspiration";

type Params = {
  id: string; // eventId
};

const CATEGORY_LABELS: Record<InspirationCategory, string> = {
  DEKORACJE: "Dekoracje",
  KWIATY: "Kwiaty",
  STROJE: "Stroje",
  PAPETERIA: "Papeteria",
  INNE: "Inne",
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
  const [newItemCategory, setNewItemCategory] =
    useState<InspirationCategory>("DEKORACJE");
  const [newItemTags, setNewItemTags] = useState("");
  const [newItemDescription, setNewItemDescription] = useState("");

  // filtrowanie
  const [categoryFilter, setCategoryFilter] = useState<InspirationCategory | "all">("all");
  const [searchFilter, setSearchFilter] = useState("");

  useEffect(() => {
    if (!eventId) return;

    const fetchBoards = async () => {
      try {
        setLoadingBoards(true);
        setError(null);
        const data = await api.getInspirationBoards(eventId);
        setBoards(data);
        if (data.length > 0 && !selectedBoardId) {
          setSelectedBoardId(data[0].id);
        }
      } catch (err) {
        console.error("❌ Błąd pobierania tablic inspiracji:", err);
        setError("Nie udało się pobrać tablic inspiracji");
      } finally {
        setLoadingBoards(false);
      }
    };

    fetchBoards();
}, [eventId, selectedBoardId]);

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
      if (!selectedBoardId) {
        setSelectedBoardId(created.id);
      }
    } catch (err) {
      console.error("❌ Błąd tworzenia tablicy inspiracji:", err);
      setError("Nie udało się utworzyć tablicy");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBoard = async (board: InspirationBoard) => {
    if (!window.confirm(`Na pewno chcesz usunąć tablicę "${board.name}"?`)) {
      return;
    }
    try {
      setSaving(true);
      await api.deleteInspirationBoard(board.id);
      setBoards((prev) => prev.filter((b) => b.id !== board.id));
      if (selectedBoardId === board.id) {
        setSelectedBoardId(null);
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
      const created = await api.createInspirationItem(selectedBoardId, payload);
      setItems((prev) => [...prev, created]);
      setNewItemTitle("");
      setNewItemDescription("");
      setNewItemTags("");
    } catch (err) {
      console.error("❌ Błąd tworzenia inspiracji:", err);
      setError("Nie udało się dodać inspiracji");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (item: InspirationItem) => {
    if (!window.confirm(`Na pewno chcesz usunąć inspirację "${item.title}"?`)) {
      return;
    }
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
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? updated : i))
      );
    } catch (err) {
      console.error("❌ Błąd uploadu obrazka inspiracji:", err);
      setError("Nie udało się wgrać obrazka");
    } finally {
      setSaving(false);
    }
  };

  const filteredItems = items.filter((item) => {
    if (categoryFilter !== "all" && item.category !== categoryFilter) {
      return false;
    }
    if (searchFilter.trim()) {
      const q = searchFilter.toLowerCase();
      const text = [
        item.title,
        item.description || "",
        item.tags || "",
      ]
        .join(" ")
        .toLowerCase();
      if (!text.includes(q)) return false;
    }
    return true;
  });

  const selectedBoard = boards.find((b) => b.id === selectedBoardId) || null;

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-6xl bg-white rounded-2xl shadow-md p-6 md:p-8">
        {/* Nagłówek */}
        <div className="flex items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            <Sparkles className="w-6 h-6 text-pink-500" />
            <div>
              <h1 className="text-xl font-bold">Inspiracje</h1>
              <p className="text-sm text-slate-500">
                Twórz tablice inspiracji – dekoracje, kwiaty, stroje i więcej.
              </p>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Górny panel: tablice + tworzenie nowej */}
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold">
              Tablice inspiracji ({boards.length})
            </h2>
            {loadingBoards && (
              <span className="text-xs text-slate-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Ładowanie tablic...
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
            {boards.map((board) => {
              const isActive = board.id === selectedBoardId;
              return (
                <button
                  key={board.id}
                  type="button"
                  onClick={() => setSelectedBoardId(board.id)}
                  className={`text-left rounded-xl border px-3 py-3 text-xs transition ${
                    isActive
                      ? "border-pink-400 bg-pink-50 shadow-sm"
                      : "border-slate-200 bg-slate-50/40 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-lg">
                      {board.emoji ?? "✨"}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteBoard(board);
                      }}
                      className="text-[10px] text-slate-400 hover:text-red-500"
                    >
                      Usuń
                    </button>
                  </div>
                  <div className="font-semibold text-slate-800 truncate mb-1">
                    {board.name}
                  </div>
                  {board.description && (
                    <div className="text-[11px] text-slate-500 line-clamp-2">
                      {board.description}
                    </div>
                  )}
                </button>
              );
            })}

            {/* Karta dodania nowej tablicy */}
            <div className="rounded-xl border border-dashed border-slate-300 px-3 py-3 text-xs flex flex-col justify-between bg-slate-50/60">
              <div>
                <div className="font-semibold mb-1">Nowa tablica</div>
                <input
                  type="text"
                  placeholder="Nazwa tablicy..."
                  value={newBoardName}
                  onChange={(e) => setNewBoardName(e.target.value)}
                  className="w-full mb-2 rounded-lg border border-slate-200 px-2 py-1 text-[11px]"
                />
                <textarea
                  placeholder="Krótki opis (opcjonalnie)"
                  value={newBoardDescription}
                  onChange={(e) =>
                    setNewBoardDescription(e.target.value)
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-[11px] min-h-[40px]"
                />
              </div>
              <button
                type="button"
                onClick={handleCreateBoard}
                disabled={saving}
                className="mt-2 inline-flex items-center justify-center gap-1 rounded-lg bg-pink-500 text-white px-2 py-1 text-[11px] hover:bg-pink-600 disabled:opacity-60"
              >
                <Plus className="w-3 h-3" />
                {saving ? "Zapisywanie..." : "Dodaj tablicę"}
              </button>
            </div>
          </div>
        </section>

        {/* Środek: wybrana tablica + inspiracje */}
        {selectedBoard ? (
          <section>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h2 className="text-sm font-semibold">
                  Tablica: {selectedBoard.name}
                </h2>
                {selectedBoard.description && (
                  <p className="text-xs text-slate-500">
                    {selectedBoard.description}
                  </p>
                )}
              </div>
              <div className="flex gap-2 text-[11px]">
                <select
                  value={categoryFilter}
                  onChange={(e) =>
                    setCategoryFilter(
                      e.target.value === "all"
                        ? "all"
                        : (e.target.value as InspirationCategory)
                    )
                  }
                  className="rounded-lg border border-slate-200 px-2 py-1"
                >
                  <option value="all">Wszystkie kategorie</option>
                  {(
                    ["DEKORACJE", "KWIATY", "STROJE", "PAPETERIA", "INNE"] as InspirationCategory[]
                  ).map((c) => (
                    <option key={c} value={c}>
                      {CATEGORY_LABELS[c]}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Szukaj po tytule/tagach..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="rounded-lg border border-slate-200 px-2 py-1 w-40"
                />
              </div>
            </div>

            {loadingItems && (
              <p className="text-xs text-slate-500 mb-2 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                Ładowanie inspiracji...
              </p>
            )}

            {/* Formularz dodania inspiracji */}
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs">
              <div className="flex items-center gap-2 mb-2">
                <ImageIcon className="w-4 h-4 text-pink-500" />
                <span className="font-semibold">
                  Dodaj inspirację do tej tablicy
                </span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="md:col-span-2">
                  <input
                    type="text"
                    placeholder="Tytuł inspiracji..."
                    value={newItemTitle}
                    onChange={(e) => setNewItemTitle(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 mb-2"
                  />
                  <textarea
                    placeholder="Opis / notatki (opcjonalnie)"
                    value={newItemDescription}
                    onChange={(e) =>
                      setNewItemDescription(e.target.value)
                    }
                    className="w-full rounded-lg border border-slate-200 px-2 py-1 min-h-[40px]"
                  />
                </div>
                <div className="space-y-2">
                  <select
                    value={newItemCategory}
                    onChange={(e) =>
                      setNewItemCategory(e.target.value as InspirationCategory)
                    }
                    className="w-full rounded-lg border border-slate-200 px-2 py-1"
                  >
                    {(
                      ["DEKORACJE", "KWIATY", "STROJE", "PAPETERIA", "INNE"] as InspirationCategory[]
                    ).map((c) => (
                      <option key={c} value={c}>
                        {CATEGORY_LABELS[c]}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    placeholder="Tagi (np. rustykalny, boho)"
                    value={newItemTags}
                    onChange={(e) => setNewItemTags(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-2 py-1"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <button
                    type="button"
                    onClick={handleCreateItem}
                    disabled={saving}
                    className="w-full rounded-lg bg-pink-500 text-white px-2 py-1 hover:bg-pink-600 disabled:opacity-60"
                  >
                    {saving ? "Zapisywanie..." : "Dodaj inspirację"}
                  </button>
                </div>
              </div>
            </div>

            {/* Grid inspiracji */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-slate-200 bg-white overflow-hidden flex flex-col"
                >
                  <div className="relative">
                    {item.image_url ? (
                      <img
                        src={`${BASE_URL}${item.image_url}`}
                        alt={item.title}
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 flex items-center justify-center bg-slate-100 text-slate-400 text-[11px]">
                        Brak obrazka
                      </div>
                    )}
                    <label className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-white/90 text-[10px] px-2 py-1 cursor-pointer shadow">
                      <ImageIcon className="w-3 h-3 text-pink-500" />
                      <span>Dodaj/zmień</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) =>
                          handleUploadImage(
                            item,
                            e.target.files?.[0]
                          )
                        }
                      />
                    </label>
                  </div>
                  <div className="p-3 text-xs flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="font-semibold text-slate-800">
                        {item.title}
                      </div>
                      {item.category && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                          {CATEGORY_LABELS[item.category]}
                        </span>
                      )}
                    </div>
                    {item.tags && (
                      <div className="text-[10px] text-slate-500 mb-1">
                        {item.tags}
                      </div>
                    )}
                    {item.description && (
                      <p className="text-[11px] text-slate-500 mb-2 line-clamp-3">
                        {item.description}
                      </p>
                    )}
                    <div className="mt-auto flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleDeleteItem(item)}
                        className="text-[11px] text-slate-400 hover:text-red-500"
                      >
                        Usuń
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredItems.length === 0 && !loadingItems && (
              <p className="mt-3 text-xs text-slate-500">
                Brak inspiracji na tej tablicy. Dodaj pierwszą powyżej.
              </p>
            )}
          </section>
        ) : (
          <p className="text-xs text-slate-500">
            Brak wybranej tablicy. Dodaj tablicę po lewej stronie, aby rozpocząć.
          </p>
        )}
      </div>
    </div>
  );
}
