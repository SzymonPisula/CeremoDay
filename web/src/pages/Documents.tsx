import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Document,
  DocumentFile,
  StorageLocation,
  DocumentType,
} from "../types/document";
import type { CeremonyType } from "../types/interview";
import { api, BASE_URL } from "../lib/api";
import { FileText, FileUp, Download, Trash2, CheckCircle2, Plus } from "lucide-react";
import PreviewModal from "../components/preview/PreviewModal";

type Params = {
  id: string;
};

// Nazwy dodatkowych (wyjątkowych) dokumentów – po wygenerowaniu
// trafiły do bazy dokładnie z takimi nazwami.
const CIVIL_EXTRA_NAMES = new Set(
  [
    "Zezwolenie sądu na zawarcie małżeństwa",
    "Zezwolenie sądu na zawarcie małżeństwa przez pełnomocnika i pełnomocnictwo",
    "Dokument potwierdzający ustanie poprzedniego małżeństwa",
    "Dokument potwierdzający możliwość zawarcia małżeństwa (dla cudzoziemca)",
    "Tłumaczenia przysięgłe dokumentów obcojęzycznych",
    "Tłumacz podczas czynności w USC",
    "Wniosek o ślub cywilny poza USC (w plenerze)",
    // dodatkowe cywilne przy konkordacie:
    "Dokumenty dotyczące poprzedniego małżeństwa cywilnego",
  ].map((n) => n.toLowerCase())
);

const CHURCH_EXTRA_NAMES = new Set(
  [
    "Delegacja lub licencja z parafii zamieszkania",
    "Zgoda biskupa na ślub poza parafią / w szczególnym miejscu",
    "Zgoda na małżeństwo mieszane lub z osobą nieochrzczoną",
    "Dokumenty dotyczące unieważnienia poprzedniego małżeństwa (prawo kanoniczne)",
  ].map((n) => n.toLowerCase())
);

function isExtraDocument(doc: Document): boolean {
  const nameKey = doc.name.trim().toLowerCase();
  if (doc.type === "civil") return CIVIL_EXTRA_NAMES.has(nameKey);
  if (doc.type === "church") return CHURCH_EXTRA_NAMES.has(nameKey);
  return false; // custom -> nigdy nie jest extra
}

export default function Documents() {
  const { id: eventId } = useParams<Params>();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [files, setFiles] = useState<Record<string, DocumentFile[]>>({});
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [storageLocation, setStorageLocation] =
    useState<StorageLocation>("server");

  // ✅ typ ślubu bierze się z wywiadu (a nie z UI)
  const [interviewCeremony, setInterviewCeremony] =
    useState<CeremonyType | null>(null);
  const [interviewLoading, setInterviewLoading] = useState<boolean>(true);

  const [showExtras, setShowExtras] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ✅ Dodawanie własnych dokumentów
  const [customName, setCustomName] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [creatingDoc, setCreatingDoc] = useState(false);

  // ===== UI helpers (spójny „CRM vibe”) =====
  const pageWrap = "w-full max-w-6xl mx-auto px-6 py-8";
  const cardBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_24px_80px_rgba(0,0,0,0.45)]";
  const sectionTitle = "text-sm font-semibold text-white/85";
  const muted = "text-sm text-white/60";

  const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
    "bg-white/5 text-white border border-white/10 " +
    "hover:bg-white/10 hover:border-white/15 " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40 " +
    "transition";

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/45 " +
    "transition";

  const chip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full " +
    "border border-white/10 bg-white/5 text-white/80 text-xs";

  const docCard =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_18px_60px_rgba(0,0,0,0.35)]";

  const fileRow =
    "flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2 " +
    "hover:bg-white/7 transition";

  // custom radio “kafelek”
  const radioTile = (active: boolean) =>
    [
      "flex-1 rounded-2xl border px-4 py-3 cursor-pointer transition select-none",
      "bg-white/5 backdrop-blur-md",
      active
        ? "border-[#c8a04b]/40 shadow-[0_18px_50px_-30px_rgba(215,180,90,0.85)]"
        : "border-white/10 hover:border-white/15 hover:bg-white/7",
    ].join(" ");

  // “checkbox” przy dokumencie
  const statusBtn = (done: boolean) =>
    [
      "w-9 h-9 rounded-xl border flex items-center justify-center transition",
      done
        ? "bg-emerald-500/20 border-emerald-400/30 text-emerald-200"
        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10",
      "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/35",
    ].join(" ");

  const inputBase =
    "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/85 " +
    "placeholder:text-white/35 outline-none focus:ring-2 focus:ring-[#c8a04b]/35";

  // A11y: ukryte radio inputy - zostawiamy, ale styl robimy na kafelkach
  const RadioDot = ({ active }: { active: boolean }) => (
    <span
      className={[
        "inline-flex items-center justify-center w-5 h-5 rounded-full border transition",
        active
          ? "border-[#c8a04b]/55 bg-[#c8a04b]/15"
          : "border-white/15 bg-white/5",
      ].join(" ")}
    >
      <span
        className={[
          "w-2.5 h-2.5 rounded-full transition",
          active ? "bg-[#d7b45a]" : "bg-transparent",
        ].join(" ")}
      />
    </span>
  );

  // ✅ tryb wg wywiadu
  type DocMode = "civil" | "church" | "none";

  const docMode: DocMode = useMemo(() => {
    if (interviewCeremony === "civil") return "civil";
    if (interviewCeremony === "church") return "church";
    if (interviewCeremony === "reception_only") return "none";
    // fallback gdy interview jeszcze się nie załadował:
    return "church";
  }, [interviewCeremony]);


  const handlePreviewFile = async (file: DocumentFile) => {
  if (file.storage_location === "local") {
    alert("Podgląd niedostępny — plik tylko lokalnie.");
    return;
  }

  try {
    // pobieramy blob tak jak do pobierania
    const blob = await api.downloadDocumentFile(file.id);
    const objectUrl = URL.createObjectURL(blob);

    setPreview({
      open: true,
      url: objectUrl, // to już jest pełny URL (blob:)
      title: file.original_name,
    });
  } catch (err) {
    console.error("❌ Błąd podglądu pliku:", err);
    setError("Nie udało się otworzyć podglądu pliku");
  }
};

 

  // ====== helpers ======
  const refreshFiles = async (documentId: string) => {
    const docFiles = await api.getDocumentFiles(documentId);
    setFiles((prev) => ({ ...prev, [documentId]: docFiles }));
  };

  

  // ====== LOAD: interview -> docs (auto generate) ======
  useEffect(() => {
    if (!eventId) return;

    let alive = true;

    const fetchAll = async () => {
      try {
        setInterviewLoading(true);
        setLoading(true);
        setError(null);

        // 1) interview
        const interview = await api.getInterview(eventId);
        if (!alive) return;
        const ceremony = interview?.ceremony_type ?? null;
        setInterviewCeremony(ceremony);

        // 2) docs
        let docs = await api.getDocuments(eventId);
        if (!alive) return;

        // 3) AUTO-GENERATE:
        // - tylko dla civil/church
        // - tylko jeśli lista pusta
        // - tylko raz na dany event + tryb (żeby nie spamować)
        if (docs.length === 0 && ceremony && ceremony !== "reception_only") {
          const genKey = `docs:autoGenerated:${eventId}:${ceremony}`;
          const already = localStorage.getItem(genKey) === "1";
          if (!already) {
            try {
              await api.generateDefaultDocuments(
                eventId,
                ceremony === "civil" ? "civil" : "concordat",
                true
              );
              localStorage.setItem(genKey, "1");
              docs = await api.getDocuments(eventId);
            } catch (e) {
              console.warn("Auto-generate documents failed:", e);
            }
          }
        }

        setDocuments(docs);

        const allFiles: Record<string, DocumentFile[]> = {};
        for (const d of docs) {
          const docFiles = await api.getDocumentFiles(d.id);
          allFiles[d.id] = docFiles;
        }
        if (!alive) return;
        setFiles(allFiles);

        // zmiana typu => chowamy extras
        setShowExtras(false);
      } catch (err) {
        console.error("❌ Błąd pobierania dokumentów/wywiadu:", err);
        if (!alive) return;
        setError("Nie udało się pobrać danych dokumentów");
      } finally {
        if (alive) {
          setInterviewLoading(false);
          setLoading(false);
        }
      }
    };

    void fetchAll();

    return () => {
      alive = false;
    };
  }, [eventId]);

  const handleToggleStatus = async (document: Document) => {
    try {
      const newStatus = document.status === "done" ? "pending" : "done";
      const updated = await api.updateDocument(document.id, {
        status: newStatus,
      });
      setDocuments((prev) =>
        prev.map((d) => (d.id === document.id ? updated : d))
      );
    } catch (err) {
      console.error("❌ Błąd zmiany statusu:", err);
      setError("Nie udało się zmienić statusu dokumentu");
    }
  };


  const [preview, setPreview] = useState<{
  open: boolean;
  url: string;
  title?: string;
} | null>(null);


  const handleFileUpload = async (
    documentId: string,
    file: File,
    location: StorageLocation
  ) => {
    setUploadingId(documentId);
    try {
      await api.uploadDocumentFile(documentId, file, location);
      await refreshFiles(documentId);
    } catch (err) {
      console.error("❌ Błąd uploadu pliku:", err);
      setError("Nie udało się wysłać pliku");
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteFile = async (file: DocumentFile) => {
    if (!window.confirm("Na pewno chcesz usunąć ten plik?")) return;
    try {
      await api.deleteDocumentFile(file.id);
      await refreshFiles(file.document_id);
    } catch (err) {
      console.error("❌ Błąd usuwania pliku:", err);
      setError("Nie udało się usunąć pliku");
    }
  };

  const handleDownloadFile = async (file: DocumentFile) => {
    if (file.storage_location === "local") {
      alert(
        "Ten plik jest oznaczony jako przechowywany tylko lokalnie na urządzeniu. CeremoDay nie ma jego kopii."
      );
      return;
    }

    try {
      const blob = await api.downloadDocumentFile(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.original_name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("❌ Błąd pobierania pliku:", err);
      setError("Nie udało się pobrać pliku");
    }
  };

  // ✅ Dodaj własny dokument
  const handleCreateCustomDocument = async () => {
  if (!eventId) return;

  const name = customName.trim();
  if (!name) return;

  try {
    setCreatingDoc(true);
    setError(null);

    const created = await api.createDocument(eventId, {
  name,
  description: customDescription.trim() || null,
  type: "custom",
  status: "pending",
});


    // dorzucamy na górę
    setDocuments((prev) => [created as Document, ...prev]);
    setFiles((prev) => ({ ...prev, [created.id]: [] }));

    setCustomName("");
    setCustomDescription("");
  } catch (e) {
    console.error(e);
    setError(e instanceof Error ? e.message : "Nie udało się dodać dokumentu");
  } finally {
    setCreatingDoc(false);
  }
};


  // === Filtry listy wg trybu ===
  // - docMode civil -> pokazujemy civil + custom
  // - docMode church -> pokazujemy church + custom
  // - docMode none -> pokazujemy tylko custom
  const visibleDocs = useMemo(() => {
  if (docMode === "none") return documents.filter((d) => d.type === "custom");
  if (docMode === "civil")
    return documents.filter((d) => d.type === "civil" || d.type === "custom");
  return documents.filter((d) => d.type === "church" || d.type === "custom");
}, [documents, docMode]);


  const mandatoryDocs = useMemo(() => {
    return visibleDocs.filter((d) => !isExtraDocument(d));
  }, [visibleDocs]);

  const extraDocs = useMemo(() => {
    // extras tylko dla civil/church
    if (docMode === "none") return [];
    return visibleDocs.filter((d) => isExtraDocument(d));
  }, [visibleDocs, docMode]);

  const hasAnyVisibleDocs = visibleDocs.length > 0;

  const modeLabel =
    docMode === "none"
      ? "Samo przyjęcie weselne"
      : docMode === "civil"
      ? "Ślub cywilny"
      : "Ślub kościelny (konkordatowy)";

  const docTypeBadge = (t: DocumentType) => {
    if (t === "custom") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-white/10 bg-white/5 text-white/70">
          własny
        </span>
      );
    }
    if (t === "civil") {
      return (
        <span className="text-[10px] px-2 py-0.5 rounded-full border border-sky-300/20 bg-sky-500/10 text-sky-200">
          cywilny
        </span>
      );
    }
    return (
      <span className="text-[10px] px-2 py-0.5 rounded-full border border-violet-300/20 bg-violet-500/10 text-violet-200">
        kościelny
      </span>
    );
  };

  return (
    <div className={pageWrap}>
      <div className={`${cardBase} p-6 md:p-8`}>
        {/* Nagłówek */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl border border-white/10 bg-white/5 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[#d7b45a]" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold text-white">Dokumenty</h1>
              <p className={muted}>
                Lista dokumentów i załączników. Tryb jest ustawiany przez wywiad.
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-2">
            {interviewLoading || loading ? (
              <span className="text-xs text-white/50">Odświeżanie…</span>
            ) : (
              <span className="text-xs text-white/50">
                Zarządzaj checklistą i plikami
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-2xl border border-red-400/20 bg-red-500/10 text-red-100 px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Info: tryb z wywiadu */}
        <section className="mb-5">
          <div className="flex items-center justify-between gap-3 mb-2">
            <h2 className={sectionTitle}>Tryb dokumentów (z wywiadu)</h2>
            <span className="text-xs text-white/45">Automatycznie</span>
          </div>

          <div className={chip}>{modeLabel}</div>

          {docMode === "none" && (
            <p className="mt-2 text-sm text-white/55">
              Dla opcji <span className="text-white font-semibold">„Samo przyjęcie”</span>{" "}
              nie generujemy listy formalnych dokumentów. Możesz jednak dodawać własne dokumenty i pliki poniżej.
            </p>
          )}
        </section>

        {/* Storage */}
        <section className={`${docCard} p-5 mb-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className={sectionTitle}>Miejsce przechowywania załączników</h2>
              <p className="text-sm text-white/55 mt-1">
                Wybierz domyślny sposób przechowywania nowych plików.
              </p>
            </div>
            <span className={chip}>
              {storageLocation === "server" ? "Serwer" : "Lokalnie"}
            </span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className={radioTile(storageLocation === "server")}>
              <div className="flex items-start gap-3">
                <RadioDot active={storageLocation === "server"} />
                <div>
                  <div className="text-sm font-semibold text-white">
                    Na serwerze CeremoDay
                  </div>
                  <div className="text-xs text-white/55 mt-1">
                    Dostępne na innych urządzeniach.
                  </div>
                </div>
              </div>
              <input
                className="sr-only"
                type="radio"
                value="server"
                checked={storageLocation === "server"}
                onChange={() => setStorageLocation("server")}
              />
            </label>

            <label className={radioTile(storageLocation === "local")}>
              <div className="flex items-start gap-3">
                <RadioDot active={storageLocation === "local"} />
                <div>
                  <div className="text-sm font-semibold text-white">
                    Tylko lokalnie na moim urządzeniu
                  </div>
                  <div className="text-xs text-white/55 mt-1">
                    CeremoDay zapisze metadane, nie treść pliku.
                  </div>
                </div>
              </div>
              <input
                className="sr-only"
                type="radio"
                value="local"
                checked={storageLocation === "local"}
                onChange={() => setStorageLocation("local")}
              />
            </label>
          </div>
        </section>

        {/* ✅ Dodaj własny dokument (zawsze) */}
        <section className={`${docCard} p-5 mb-6`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className={sectionTitle}>Dodaj własny dokument</h2>
              <p className="text-sm text-white/55 mt-1">
                Dodaj dowolny dokument do checklisty (np. umowa, potwierdzenie, notatka, skan).
              </p>
            </div>
            <span className={chip}>Własne</span>
          </div>

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            

            <div>
              <label className="text-xs text-white/55">Nazwa</label>
              <input
                className={inputBase}
                placeholder="np. Umowa z salą / Potwierdzenie rezerwacji"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-xs text-white/55">Opis (opcjonalnie)</label>
              <textarea
                className={inputBase + " min-h-[90px]"}
                placeholder="Terminy, kto załatwia, co trzeba przygotować…"
                value={customDescription}
                onChange={(e) => setCustomDescription(e.target.value)}
              />
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={creatingDoc || !customName.trim()}
              className={btnGold}
              onClick={() => void handleCreateCustomDocument()}
            >
              <Plus className="w-4 h-4" />
              {creatingDoc ? "Dodawanie…" : "Dodaj dokument"}
            </button>

            <span className="text-xs text-white/45">
              Po dodaniu dokumentu możesz od razu dodać załączniki w jego kafelku.
            </span>
          </div>
        </section>

        {/* Lista dokumentów (dla civil/church: system + custom; dla reception_only: tylko custom) */}
        {!hasAnyVisibleDocs && !loading && (
          <section className={`${docCard} p-5 mb-6`}>
            <p className="text-sm text-white/65">
              Brak dokumentów.{" "}
              {docMode === "none"
                ? "Dodaj własny dokument powyżej."
                : "Lista startowa generuje się automatycznie po wywiadzie (przy pierwszym wejściu). Jeśli nadal jest pusto — dodaj własny dokument powyżej."}
            </p>
          </section>
        )}

        {hasAnyVisibleDocs && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Lista dokumentów
                </h2>
                <p className="text-sm text-white/50 mt-1">
                  Odhaczaj, dodawaj pliki i trzymaj porządek.
                </p>
              </div>

              {loading ? (
                <span className="text-xs text-white/45">Odświeżanie…</span>
              ) : (
                <span className={chip}>
                  {mandatoryDocs.filter((d) => d.status === "done").length}/
                  {mandatoryDocs.length} done
                </span>
              )}
            </div>

            {/* Obowiązkowe + własne */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className={sectionTitle}>
                  {docMode === "none" ? "Twoje dokumenty" : "Obowiązkowe + własne"}
                </h3>
                <span className="text-xs text-white/45">
                  {mandatoryDocs.length} pozycji
                </span>
              </div>

              {mandatoryDocs.length === 0 ? (
                <p className="text-sm text-white/55">
                  Brak dokumentów w tej sekcji.
                </p>
              ) : (
                <div className="space-y-4">
                  {mandatoryDocs.map((doc) => {
                    const docFiles = files[doc.id] ?? [];
                    const done = doc.status === "done";

                    return (
                      <div key={doc.id} className={`${docCard} p-5`}>
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <button
                              type="button"
                              onClick={() => void handleToggleStatus(doc)}
                              className={statusBtn(done)}
                              aria-label={done ? "Oznacz jako niegotowe" : "Oznacz jako gotowe"}
                            >
                              {done ? (
                                <CheckCircle2 className="w-5 h-5" />
                              ) : (
                                <span className="text-xs font-semibold">✓</span>
                              )}
                            </button>

                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="text-base font-semibold text-white">
                                  {doc.name}
                                </span>

                                {docTypeBadge(doc.type as DocumentType)}

                                {isExtraDocument(doc) ? (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300/20 bg-amber-500/10 text-amber-200">
                                    dodatkowy
                                  </span>
                                ) : (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-[#c8a04b]/25 bg-[#c8a04b]/10 text-[#d7b45a]">
                                    standard
                                  </span>
                                )}

                                {done && (
                                  <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                                    gotowe
                                  </span>
                                )}
                              </div>

                              {doc.description && (
                                <p className="text-sm text-white/55 mt-1">
                                  {doc.description}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div className="text-xs text-white/45">Załączniki</div>
                            <div className="text-sm text-white/80 font-semibold">
                              {docFiles.length}
                            </div>
                          </div>
                        </div>

                        {/* Pliki + upload */}
                        <div className="mt-4 border-t border-white/10 pt-4">
                          {docFiles.length === 0 ? (
                            <p className="text-sm text-white/45">
                              Brak załączonych plików.
                            </p>
                          ) : (
                            <ul className="space-y-2">
                              {docFiles.map((file) => (
                                <li key={file.id} className={fileRow}>
                                  <div className="flex items-center gap-2 min-w-0">
                                    <FileText className="w-4 h-4 text-white/45 shrink-0" />
                                    <span className="text-sm text-white/85 truncate">
                                      {file.original_name}
                                    </span>
                                    <span className="text-[11px] text-white/40 shrink-0">
                                      {Math.round(file.size / 1024)} kB
                                    </span>
                                    <span className="text-[11px] text-white/55 shrink-0">
                                      {file.storage_location === "server"
                                        ? "Serwer"
                                        : "Tylko lokalnie"}
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
  {/* Podgląd tylko dla plików z serwera */}
  {file.storage_location === "server" ? (
  <button
    type="button"
    onClick={() => void handlePreviewFile(file)}
    className="inline-flex items-center gap-1 text-xs text-white/65 hover:text-[#d7b45a] transition"
    title="Podgląd"
  >
    Podgląd
  </button>
) : (
  <span className="text-xs text-white/35" title="Plik tylko lokalnie">
    Podgląd niedostępny
  </span>
)}


  <button
    type="button"
    onClick={() => void handleDownloadFile(file)}
    className="inline-flex items-center gap-1 text-xs text-white/65 hover:text-[#d7b45a] transition"
  >
    <Download className="w-4 h-4" />
    Pobierz
  </button>

  <button
    type="button"
    onClick={() => void handleDeleteFile(file)}
    className="inline-flex items-center gap-1 text-xs text-white/55 hover:text-red-300 transition"
  >
    <Trash2 className="w-4 h-4" />
    Usuń
  </button>
</div>

                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="mt-3 flex items-center justify-between gap-3">
                            <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                              <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition">
                                <FileUp className="w-4 h-4 text-[#d7b45a]" />
                                {uploadingId === doc.id ? "Wysyłanie..." : "Dodaj plik"}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                  const f = e.target.files?.[0];
                                  if (f) {
                                    void handleFileUpload(doc.id, f, storageLocation);
                                    e.target.value = "";
                                  }
                                }}
                              />
                            </label>

                            <span className="text-xs text-white/45">
                              Domyślnie: {storageLocation === "server" ? "serwer" : "lokalnie"}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Dodatkowe (tylko civil/church) */}
            {docMode !== "none" && extraDocs.length > 0 && (
              <div className="mt-2">
                {!showExtras ? (
                  <div className={`${docCard} p-5`}>
                    <p className="text-sm text-white/65 mb-3">
                      Masz{" "}
                      <span className="text-white font-semibold">{extraDocs.length}</span>{" "}
                      dokumentów dla sytuacji wyjątkowych (pełnomocnik, cudzoziemiec, unieważnienie itd.).
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowExtras(true)}
                      className={btnSecondary}
                    >
                      Pokaż dodatkowe dokumenty
                    </button>
                  </div>
                ) : (
                  <div className={`${docCard} p-5`}>
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <h3 className={sectionTitle}>Dodatkowe (wyjątkowe sytuacje)</h3>
                      <button
                        type="button"
                        onClick={() => setShowExtras(false)}
                        className="text-xs text-white/55 hover:text-white/80 transition"
                      >
                        Ukryj
                      </button>
                    </div>

                    <div className="space-y-4">
                      {extraDocs.map((doc) => {
                        const docFiles = files[doc.id] ?? [];
                        const done = doc.status === "done";

                        return (
                          <div key={doc.id} className={`${docCard} p-5 bg-white/4`}>
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => void handleToggleStatus(doc)}
                                  className={statusBtn(done)}
                                  aria-label={done ? "Oznacz jako niegotowe" : "Oznacz jako gotowe"}
                                >
                                  {done ? (
                                    <CheckCircle2 className="w-5 h-5" />
                                  ) : (
                                    <span className="text-xs font-semibold">✓</span>
                                  )}
                                </button>

                                <div>
                                  <div className="flex flex-wrap items-center gap-2">
                                    <span className="text-base font-semibold text-white">
                                      {doc.name}
                                    </span>
                                    {docTypeBadge(doc.type as DocumentType)}
                                    <span className="text-[10px] px-2 py-0.5 rounded-full border border-amber-300/20 bg-amber-500/10 text-amber-200">
                                      dodatkowy
                                    </span>
                                    {done && (
                                      <span className="text-[10px] px-2 py-0.5 rounded-full border border-emerald-400/20 bg-emerald-500/10 text-emerald-200">
                                        gotowe
                                      </span>
                                    )}
                                  </div>

                                  {doc.description && (
                                    <p className="text-sm text-white/55 mt-1">
                                      {doc.description}
                                    </p>
                                  )}
                                </div>
                              </div>

                              <div className="text-right">
                                <div className="text-xs text-white/45">Załączniki</div>
                                <div className="text-sm text-white/80 font-semibold">
                                  {docFiles.length}
                                </div>
                              </div>
                            </div>

                            <div className="mt-4 border-t border-white/10 pt-4">
                              {docFiles.length === 0 ? (
                                <p className="text-sm text-white/45">Brak załączonych plików.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {docFiles.map((file) => (
                                    <li key={file.id} className={fileRow}>
                                      <div className="flex items-center gap-2 min-w-0">
                                        <FileText className="w-4 h-4 text-white/45 shrink-0" />
                                        <span className="text-sm text-white/85 truncate">
                                          {file.original_name}
                                        </span>
                                        <span className="text-[11px] text-white/40 shrink-0">
                                          {Math.round(file.size / 1024)} kB
                                        </span>
                                        <span className="text-[11px] text-white/55 shrink-0">
                                          {file.storage_location === "server"
                                            ? "Serwer"
                                            : "Tylko lokalnie"}
                                        </span>
                                      </div>

                                      <div className="flex items-center gap-2 shrink-0">
                                        <button
                                          type="button"
                                          onClick={() => void handleDownloadFile(file)}
                                          className="inline-flex items-center gap-1 text-xs text-white/65 hover:text-[#d7b45a] transition"
                                        >
                                          <Download className="w-4 h-4" />
                                          Pobierz
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => void handleDeleteFile(file)}
                                          className="inline-flex items-center gap-1 text-xs text-white/55 hover:text-red-300 transition"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                          Usuń
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              <div className="mt-3">
                                <label className="inline-flex items-center gap-2 cursor-pointer text-sm">
                                  <span className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/10 transition">
                                    <FileUp className="w-4 h-4 text-[#d7b45a]" />
                                    {uploadingId === doc.id ? "Wysyłanie..." : "Dodaj plik"}
                                  </span>
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="hidden"
                                    onChange={(e) => {
                                      const f = e.target.files?.[0];
                                      if (f) {
                                        void handleFileUpload(doc.id, f, storageLocation);
                                        e.target.value = "";
                                      }
                                    }}
                                  />
                                </label>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        )}
      </div>
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
