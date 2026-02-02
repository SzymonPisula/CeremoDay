// CeremoDay/web/src/pages/Documents.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { FileText, Loader2, Plus, Trash2, X } from "lucide-react";

import { api } from "../lib/api";
import { useUiStore } from "../store/ui";
import type { Document, DocumentStatus, DocumentType } from "../types/document";

import DocumentStatusInline from "../components/documents/DocumentStatusInline";
import DocumentFilesList from "../components/documents/DocumentFilesList";

type Params = { id: string };
type Tab = "main" | "extra";

type CeremonyMode = "unknown" | "civil" | "concordat" | "reception";

function resolveCeremonyMode(interview: unknown): CeremonyMode {
  if (!interview || typeof interview !== "object") return "unknown";

  const obj = interview as Record<string, unknown>;
  const raw =
    (typeof obj.ceremony_type === "string" && obj.ceremony_type) ||
    (typeof obj.ceremonyType === "string" && obj.ceremonyType) ||
    (typeof obj.ceremony === "string" && obj.ceremony) ||
    (typeof obj.type === "string" && obj.type) ||
    "";

  const s = String(raw).toLowerCase();

  if (s.includes("reception") || s.includes("party") || s.includes("przyjec")) return "reception";
  if (s.includes("civil") || s.includes("cywil")) return "civil";
  if (s.includes("concordat") || s.includes("kosc") || s.includes("church")) return "concordat";

  return "unknown";
}

function statusLabel(s: DocumentStatus): string {
  // Dopasuj do Waszych enumów, ale bezpiecznie:
  const x = String(s);
  if (x === "todo") return "Do zrobienia";
  if (x === "in_progress") return "W trakcie";
  if (x === "done") return "Ukończone";
  return x;
}

export default function Documents() {
  const { id: eventId } = useParams<Params>();

  const toast = useUiStore((s) => s.toast);
  const confirmAsync = useUiStore((s) => s.confirmAsync);

  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  const [tab, setTab] = useState<Tab>("main");

  const [ceremony, setCeremony] = useState<CeremonyMode>("unknown");
  const [interviewLoaded, setInterviewLoaded] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const generatedForRef = useRef<Set<CeremonyMode>>(new Set());

  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-[0_24px_80px_rgba(0,0,0,0.45)]";
  const chip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/80 text-xs";

  const fetchAll = async (opts?: { allowGenerate?: boolean }) => {
    if (!eventId) return;

    setLoading(true);
    try {
      const interview = await api.getInterview(eventId);
      const mode = resolveCeremonyMode(interview);
      setCeremony(mode);
      setInterviewLoaded(true);

      const docs = await api.getDocuments(eventId);

      const allowGenerate = opts?.allowGenerate ?? true;
      const ceremonyForApi = mode === "civil" ? "civil" : mode === "concordat" ? "concordat" : null;

      const hasSystemForMode =
        ceremonyForApi === "civil"
          ? docs.some((d) => d.is_system && d.type === "civil")
          : ceremonyForApi === "concordat"
            ? docs.some((d) => d.is_system && d.type === "concordat")
            : true;

      if (allowGenerate && ceremonyForApi && !generatedForRef.current.has(mode) && !hasSystemForMode) {
        generatedForRef.current.add(mode);
        await api.generateDefaultDocuments(eventId, ceremonyForApi, true);
        const after = await api.getDocuments(eventId);
        setDocuments(after);

        toast({
          tone: "success",
          title: "Dodano domyślne dokumenty",
          message: "Lista została odświeżona na podstawie wywiadu.",
        });
        return;
      }

      setDocuments(docs);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się wczytać dokumentów.";
      toast({ tone: "danger", title: "Błąd", message: msg });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!eventId) return;
    generatedForRef.current = new Set();
    void fetchAll({ allowGenerate: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  useEffect(() => {
    const onInterviewUpdated = (e: Event) => {
      const ce = e as CustomEvent<{ eventId?: string }>;
      if (!ce.detail?.eventId) return;
      if (ce.detail.eventId !== eventId) return;
      generatedForRef.current = new Set();
      void fetchAll({ allowGenerate: true });
    };

    window.addEventListener("ceremoday:interview-updated", onInterviewUpdated as EventListener);
    return () => {
      window.removeEventListener("ceremoday:interview-updated", onInterviewUpdated as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [eventId]);

  const visibleDocuments = useMemo(() => {
    if (ceremony === "civil") return documents.filter((d) => !d.is_system || d.type === "civil");
    if (ceremony === "concordat") return documents.filter((d) => !d.is_system || d.type === "concordat");
    if (ceremony === "reception") return documents.filter((d) => !d.is_system);
    return documents;
  }, [documents, ceremony]);

  const mainDocs = useMemo(() => visibleDocuments.filter((d) => d.is_pinned), [visibleDocuments]);
  const extraDocs = useMemo(() => visibleDocuments.filter((d) => !d.is_pinned), [visibleDocuments]);
  const docsToShow = tab === "main" ? mainDocs : extraDocs;

  const handleStatusChange = async (doc: Document, next: DocumentStatus) => {
    try {
      setSavingId(doc.id);
      const updated = await api.changeDocumentStatus(doc.id, next);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));

      toast({
        tone: "success",
        title: "Zmieniono status",
        message: `„${doc.name}” → ${statusLabel(next)}`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się zmienić statusu.";
      toast({ tone: "danger", title: "Nie udało się zmienić statusu", message: msg });
    } finally {
      setSavingId(null);
    }
  };

  const handleMoveDoc = async (doc: Document, toPinned: boolean) => {
    try {
      setSavingId(doc.id);
      const updated = await api.setDocumentPinned(doc.id, toPinned);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));

      toast({
        tone: "success",
        title: "Zapisano",
        message: toPinned ? "Przeniesiono do głównych." : "Przeniesiono do dodatkowych.",
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się przenieść dokumentu.";
      toast({ tone: "danger", title: "Nie udało się zapisać", message: msg });
    } finally {
      setSavingId(null);
    }
  };

  const handleDeleteDoc = async (doc: Document) => {
    if (doc.is_system) return;

    const ok = await confirmAsync({
      title: "Usunąć dokument?",
      message: `Dokument „${doc.name}” zostanie trwale usunięty wraz z przypiętymi plikami.`,
      confirmText: "Usuń dokument",
      cancelText: "Anuluj",
      tone: "danger",
    });

    if (!ok) return;

    try {
      setSavingId(doc.id);
      await api.deleteDocument(doc.id);
      setDocuments((prev) => prev.filter((d) => d.id !== doc.id));

      toast({ tone: "success", title: "Usunięto dokument", message: `„${doc.name}”` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się usunąć dokumentu.";
      toast({ tone: "danger", title: "Błąd", message: msg });
    } finally {
      setSavingId(null);
    }
  };

  // -----------------------
  // Create + Edit modal
  // -----------------------
  const [editId, setEditId] = useState<string | null>(null);

  const [createName, setCreateName] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createType, setCreateType] = useState<DocumentType>("custom");

  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editType, setEditType] = useState<DocumentType>("custom");

  const openEdit = (doc: Document) => {
    setEditId(doc.id);
    setEditName(doc.name ?? "");
    setEditDesc(doc.description ?? "");
    setEditType(doc.type ?? "custom");
    setEditOpen(true);
  };

  const resetEdit = () => {
    setEditId(null);
    setEditName("");
    setEditDesc("");
    setEditType("custom");
  };

  const submitEdit = async () => {
    if (!editId) return;
    if (!editName.trim()) {
      toast({ tone: "danger", title: "Brak nazwy", message: "Wpisz nazwę dokumentu." });
      return;
    }

    try {
      setSavingId("__edit__");
      const updated = await api.updateDocument(editId, {
        name: editName.trim(),
        description: editDesc.trim() ? editDesc.trim() : null,
        type: editType,
      });

      setDocuments((prev) => prev.map((d) => (d.id === updated.id ? updated : d)));
      setEditOpen(false);
      resetEdit();

      toast({ tone: "success", title: "Zapisano zmiany", message: `„${updated.name}”` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się zapisać zmian.";
      toast({ tone: "danger", title: "Błąd", message: msg });
    } finally {
      setSavingId(null);
    }
  };

  useEffect(() => {
    if (ceremony === "reception") setCreateType("custom");
    else if (ceremony === "concordat") setCreateType("concordat");
    else setCreateType("civil");
  }, [ceremony]);

  const resetCreate = () => {
    setCreateName("");
    setCreateDesc("");
    setCreateType(ceremony === "reception" ? "custom" : ceremony === "concordat" ? "concordat" : "civil");
  };

  const submitCreate = async () => {
    if (!eventId) return;
    if (!createName.trim()) {
      toast({ tone: "danger", title: "Brak nazwy", message: "Wpisz nazwę dokumentu." });
      return;
    }

    try {
      setSavingId("__create__");

      const created = await api.createDocument(eventId, {
        name: createName.trim(),
        description: createDesc.trim() ? createDesc.trim() : null,
        type: createType,
        is_pinned: true,
      });

      setDocuments((prev) => [...prev, created]);
      setCreateOpen(false);
      resetCreate();

      toast({ tone: "success", title: "Dodano dokument", message: `„${created.name}”` });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się dodać dokumentu.";
      toast({ tone: "danger", title: "Błąd", message: msg });
    } finally {
      setSavingId(null);
    }
  };

  const ceremonyBadge = useMemo(() => {
    if (!interviewLoaded) return null;
    if (ceremony === "civil") return { label: "Ślub cywilny", cls: "bg-white/5 border-white/10 text-white/70" };
    if (ceremony === "concordat")
      return { label: "Ślub kościelny", cls: "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white" };
    if (ceremony === "reception") return { label: "Samo przyjęcie", cls: "bg-white/5 border-white/10 text-white/70" };
    return { label: "Brak danych z wywiadu", cls: "bg-white/5 border-white/10 text-white/60" };
  }, [ceremony, interviewLoaded]);

  return (
    <div className="p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
            <FileText className="w-5 h-5 text-[#d7b45a]" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-2xl font-bold text-white">Dokumenty</h2>
              {ceremonyBadge && (
                <span className={"inline-flex items-center px-3 py-1 rounded-full border text-xs " + ceremonyBadge.cls}>
                  {ceremonyBadge.label}
                </span>
              )}
            </div>
            <p className="text-sm text-white/60">Wszystkie formalności i pliki w jednym miejscu</p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setCreateOpen(true)}
          className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14]"
        >
          <Plus className="w-4 h-4" />
          Dodaj dokument
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab("main")}
          className={
            "px-4 py-2 rounded-full text-sm border transition " +
            (tab === "main"
              ? "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white"
              : "bg-white/5 border-white/10 text-white/60 hover:text-white")
          }
        >
          Główne <span className="ml-2 text-xs opacity-70">({mainDocs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setTab("extra")}
          className={
            "px-4 py-2 rounded-full text-sm border transition " +
            (tab === "extra"
              ? "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white"
              : "bg-white/5 border-white/10 text-white/60 hover:text-white")
          }
        >
          Dodatkowe <span className="ml-2 text-xs opacity-70">({extraDocs.length})</span>
        </button>
      </div>

      {/* List */}
      <div className={cardBase}>
        {loading && (
          <div className="text-xs text-white/60 flex items-center gap-2 mb-3">
            <Loader2 className="w-4 h-4 animate-spin" />
            Wczytywanie…
          </div>
        )}

        {!loading && interviewLoaded && ceremony === "unknown" && (
          <div className="mb-3 text-xs text-white/60">
            Nie udało się odczytać typu uroczystości z wywiadu. Uzupełnij wywiad i wróć tutaj.
          </div>
        )}

        {docsToShow.length === 0 && !loading && <p className="text-sm text-white/60">Brak dokumentów w tej sekcji.</p>}

        <div className="space-y-3">
          {docsToShow.map((doc) => {
            const isSaving = savingId === doc.id;
            const canEditFields = !doc.is_system;

            return (
              <div key={doc.id} className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-semibold text-white">{doc.name}</span>
                      {doc.category && <span className={chip}>{doc.category}</span>}

                      {doc.type === "concordat" && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/70 text-xs">
                          Kościół
                        </span>
                      )}
                      {doc.type === "custom" && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/70 text-xs">
                          Inny
                        </span>
                      )}
                      {doc.is_system && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/60 text-xs">
                          Domyślny
                        </span>
                      )}

                      {isSaving && (
                        <span className="text-xs text-white/40 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" /> zapis…
                        </span>
                      )}
                    </div>

                    {doc.description && <p className="text-sm text-white/60">{doc.description}</p>}

                    {/* ✅ Files + toasty w samym komponencie */}
                    <DocumentFilesList documentId={doc.id} documentName={doc.name ?? "Dokument"} />
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <DocumentStatusInline
                      status={doc.status}
                      onChange={(next) => handleStatusChange(doc, next)}
                      disabled={isSaving}
                    />

                    <button
                      type="button"
                      disabled={isSaving}
                      onClick={() => void handleMoveDoc(doc, !doc.is_pinned)}
                      className={
                        "inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-medium border transition " +
                        (doc.is_pinned
                          ? "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                          : "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white hover:bg-[#c8a04b]/20")
                      }
                      title={doc.is_pinned ? "Przenieś do dodatkowych" : "Przenieś do głównych"}
                    >
                      {doc.is_pinned ? "Do dodatkowych" : "Do głównych"}
                    </button>

                    {canEditFields && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => openEdit(doc)}
                          className="inline-flex items-center justify-center px-3 py-1 rounded-lg text-xs font-medium border border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
                          title="Edytuj dokument"
                        >
                          Edytuj
                        </button>

                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => void handleDeleteDoc(doc)}
                          className="inline-flex items-center gap-2 justify-center px-3 py-1 rounded-lg text-xs font-medium border border-red-400/25 bg-red-500/10 text-red-100 hover:bg-red-500/15"
                          title="Usuń dokument"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Usuń
                        </button>
                      </div>
                    )}

                    {!canEditFields && (
                      <span className="text-[11px] text-white/40 w-28 text-right">
                        Domyślny dokument nie podlega edycji
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Create modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setCreateOpen(false)} />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0b1b14] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between p-5 border-b border-white/10">
                <div>
                  <div className="text-white font-semibold">Dodaj dokument</div>
                  <div className="text-xs text-white/60">Utwórz własny dokument dla wydarzenia.</div>
                </div>
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs text-white/70 mb-1">Nazwa</div>
                  <input
                    value={createName}
                    onChange={(e) => setCreateName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                    placeholder="np. Umowa z fotografem"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/70 mb-1">Opis</div>
                  <textarea
                    value={createDesc}
                    onChange={(e) => setCreateDesc(e.target.value)}
                    className="w-full min-h-[90px] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                    placeholder="Krótka notatka co to jest i kiedy ma być gotowe..."
                  />
                </div>

                <div>
                  <div className="text-xs text-white/70 mb-1">Typ dokumentu</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setCreateType("civil")}
                      className={
                        "px-4 py-2 rounded-full text-xs border transition " +
                        (createType === "civil"
                          ? "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white")
                      }
                    >
                      Cywilny
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateType("concordat")}
                      className={
                        "px-4 py-2 rounded-full text-xs border transition " +
                        (createType === "concordat"
                          ? "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white")
                      }
                    >
                      Kościelny
                    </button>

                    <button
                      type="button"
                      onClick={() => setCreateType("custom")}
                      className={
                        "px-4 py-2 rounded-full text-xs border transition " +
                        (createType === "custom"
                          ? "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white")
                      }
                    >
                      Inny
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreateOpen(false);
                    resetCreate();
                  }}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white/70 hover:text-white"
                >
                  Anuluj
                </button>

                <button
                  type="button"
                  disabled={savingId === "__create__" || !createName.trim()}
                  onClick={() => void submitCreate()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] disabled:opacity-60"
                >
                  {savingId === "__create__" ? "Zapis..." : "Zapisz"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/60" onClick={() => setEditOpen(false)} />
          <div className="absolute inset-0 grid place-items-center p-4">
            <div className="w-full max-w-xl rounded-2xl border border-white/10 bg-[#0b1b14] shadow-[0_30px_120px_rgba(0,0,0,0.55)]">
              <div className="flex items-start justify-between p-5 border-b border-white/10">
                <div>
                  <div className="text-white font-semibold">Edytuj dokument</div>
                  <div className="text-xs text-white/60">Zmień nazwę, opis i typ.</div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    resetEdit();
                  }}
                  className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div>
                  <div className="text-xs text-white/70 mb-1">Nazwa</div>
                  <input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                    placeholder="np. Umowa z fotografem"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/70 mb-1">Opis</div>
                  <textarea
                    value={editDesc}
                    onChange={(e) => setEditDesc(e.target.value)}
                    className="w-full min-h-[90px] rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none"
                    placeholder="Krótka notatka…"
                  />
                </div>

                <div>
                  <div className="text-xs text-white/70 mb-1">Typ dokumentu</div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setEditType("civil")}
                      className={
                        "px-4 py-2 rounded-full text-xs border transition " +
                        (editType === "civil"
                          ? "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white")
                      }
                    >
                      Cywilny
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditType("concordat")}
                      className={
                        "px-4 py-2 rounded-full text-xs border transition " +
                        (editType === "concordat"
                          ? "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white")
                      }
                    >
                      Kościelny
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditType("custom")}
                      className={
                        "px-4 py-2 rounded-full text-xs border transition " +
                        (editType === "custom"
                          ? "bg-[#c8a04b]/15 border-[#c8a04b]/40 text-white"
                          : "bg-white/5 border-white/10 text-white/60 hover:text-white")
                      }
                    >
                      Inny
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-white/10 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditOpen(false);
                    resetEdit();
                  }}
                  className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white/70 hover:text-white"
                >
                  Anuluj
                </button>

                <button
                  type="button"
                  disabled={savingId === "__edit__" || !editName.trim()}
                  onClick={() => void submitEdit()}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] disabled:opacity-60"
                >
                  {savingId === "__edit__" ? "Zapis..." : "Zapisz"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
