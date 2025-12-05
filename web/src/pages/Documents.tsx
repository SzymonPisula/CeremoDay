import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Document,
  DocumentFile,
  StorageLocation,
  DocumentType,
} from "../types/document";
import { api } from "../lib/api";
import { FileText, FileUp, Download } from "lucide-react";

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
  if (doc.type === "civil") {
    return CIVIL_EXTRA_NAMES.has(nameKey);
  }
  if (doc.type === "church") {
    return CHURCH_EXTRA_NAMES.has(nameKey);
  }
  return false;
}

export default function Documents() {
  const { id: eventId } = useParams<Params>();

  const [documents, setDocuments] = useState<Document[]>([]);
  const [files, setFiles] = useState<Record<string, DocumentFile[]>>({});
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [storageLocation, setStorageLocation] =
    useState<StorageLocation>("server");

  const [visibleType, setVisibleType] = useState<DocumentType>("church");
  const [showExtras, setShowExtras] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;

    const fetchDocs = async () => {
      try {
        setLoading(true);
        setError(null);
        const docs = await api.getDocuments(eventId);
        setDocuments(docs);

        const allFiles: Record<string, DocumentFile[]> = {};
        for (const d of docs) {
          const docFiles = await api.getDocumentFiles(d.id);
          allFiles[d.id] = docFiles;
        }
        setFiles(allFiles);
      } catch (err) {
        console.error("❌ Błąd pobierania dokumentów:", err);
        setError("Nie udało się pobrać dokumentów");
      } finally {
        setLoading(false);
      }
    };

    fetchDocs();
  }, [eventId]);

  const refreshFiles = async (documentId: string) => {
    const docFiles = await api.getDocumentFiles(documentId);
    setFiles((prev) => ({ ...prev, [documentId]: docFiles }));
  };

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

  const handleGenerateDefaults = async (ceremonyType: "civil" | "concordat") => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);

      await api.generateDefaultDocuments(eventId, ceremonyType, true);

      const docs = await api.getDocuments(eventId);
      setDocuments(docs);

      const allFiles: Record<string, DocumentFile[]> = {};
      for (const d of docs) {
        const docFiles = await api.getDocumentFiles(d.id);
        allFiles[d.id] = docFiles;
      }
      setFiles(allFiles);
    } catch (err) {
      console.error("❌ Błąd generowania listy dokumentów:", err);
      setError("Nie udało się wygenerować listy dokumentów");
    } finally {
      setLoading(false);
    }
  };

  const allDocs = documents ?? [];
  const docsForType = allDocs.filter(
    (d) => (d.type as DocumentType | undefined) === visibleType
  );

  const mandatoryDocs = docsForType.filter((d) => !isExtraDocument(d));
  const extraDocs = docsForType.filter((d) => isExtraDocument(d));

  const hasAnyDocs = allDocs.length > 0;
  const hasDocsForVisibleType = docsForType.length > 0;

  const labelForType = (type: DocumentType) =>
    type === "church" ? "ślubu kościelnego (konkordatowego)" : "ślubu cywilnego";

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 flex justify-center">
      <div className="w-full max-w-5xl bg-white rounded-2xl shadow-md p-6 md:p-8">
        {/* Nagłówek */}
        <div className="flex items-center gap-3 mb-6">
          <FileText className="w-6 h-6 text-indigo-600" />
          <div>
            <h1 className="text-xl font-bold">Dokumenty</h1>
            <p className="text-sm text-slate-500">
              Lista dokumentów wymaganych do ślubu oraz załączone pliki.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-50 text-red-700 px-4 py-2 text-sm">
            {error}
          </div>
        )}

        {/* Przełącznik typu ślubu */}
        <section className="mb-4">
          <h2 className="text-sm font-semibold mb-2">
            Rodzaj ślubu (widok listy)
          </h2>
          <div className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
            <button
              type="button"
              onClick={() => {
                setVisibleType("church");
                setShowExtras(false);
              }}
              className={`px-3 py-1 rounded-full ${
                visibleType === "church"
                  ? "bg-white shadow text-indigo-700"
                  : "text-slate-500"
              }`}
            >
              Ślub kościelny (konkordatowy)
            </button>
            <button
              type="button"
              onClick={() => {
                setVisibleType("civil");
                setShowExtras(false);
              }}
              className={`px-3 py-1 rounded-full ${
                visibleType === "civil"
                  ? "bg-white shadow text-indigo-700"
                  : "text-slate-500"
              }`}
            >
              Ślub cywilny
            </button>
          </div>
        </section>

        {/* Miejsce przechowywania załączników */}
        <section className="mb-5 border border-slate-200 rounded-xl p-4 text-xs text-slate-600">
          <h2 className="text-sm font-semibold mb-2">
            Miejsce przechowywania załączników
          </h2>
          <p className="mb-2">
            Wybierz domyślny sposób przechowywania nowych plików, gdy dodajesz
            je do dokumentów:
          </p>
          <div className="flex flex-col md:flex-row md:items-center gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="server"
                checked={storageLocation === "server"}
                onChange={() => setStorageLocation("server")}
              />
              <span>
                <span className="font-medium">Na serwerze CeremoDay</span> – pliki
                są przechowywane centralnie, możesz je pobrać z innych urządzeń.
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="radio"
                value="local"
                checked={storageLocation === "local"}
                onChange={() => setStorageLocation("local")}
              />
              <span>
                <span className="font-medium">
                  Tylko lokalnie na moim urządzeniu
                </span>{" "}
                – CeremoDay zapisuje tylko informację o pliku, nie jego treść.
              </span>
            </label>
          </div>
        </section>

        {/* Jeśli brak jakichkolwiek dokumentów */}
        {!hasAnyDocs && !loading && (
          <section className="mb-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="mb-3">
              Nie masz jeszcze żadnych dokumentów dla tego wydarzenia. Wybierz
              rodzaj ślubu, a następnie wygeneruj domyślną listę dokumentów.
            </p>
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => handleGenerateDefaults("concordat")}
                className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700"
              >
                Wygeneruj listę dla ślubu kościelnego (konkordatowego)
              </button>
              <button
                type="button"
                onClick={() => handleGenerateDefaults("civil")}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs hover:bg-emerald-700"
              >
                Wygeneruj listę dla ślubu cywilnego
              </button>
            </div>
          </section>
        )}

        {/* Jeśli są dokumenty, ale nie dla aktualnie wybranego typu */}
        {hasAnyDocs && !hasDocsForVisibleType && !loading && (
          <section className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
            <p className="mb-3">
              Nie masz jeszcze dokumentów dla{" "}
              <span className="font-medium">{labelForType(visibleType)}</span>.
            </p>
            <button
              type="button"
              onClick={() =>
                handleGenerateDefaults(
                  visibleType === "civil" ? "civil" : "concordat"
                )
              }
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs hover:bg-indigo-700"
            >
              Wygeneruj dokumenty dla {labelForType(visibleType)}
            </button>
          </section>
        )}

        {/* Lista dokumentów dla wybranego typu */}
        {hasDocsForVisibleType && (
          <section>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">
                Dokumenty dla {labelForType(visibleType)}
              </h2>
              {loading && (
                <span className="text-xs text-slate-500">
                  Odświeżanie dokumentów…
                </span>
              )}
            </div>

            {/* Obowiązkowe */}
            <div className="mb-4">
              <h3 className="text-xs font-semibold text-slate-600 mb-2">
                Obowiązkowe dokumenty
              </h3>
              {mandatoryDocs.length === 0 ? (
                <p className="text-xs text-slate-500">
                  Brak obowiązkowych dokumentów w tej kategorii.
                </p>
              ) : (
                <div className="space-y-3">
                  {mandatoryDocs.map((doc) => {
                    const docFiles = files[doc.id] ?? [];
                    return (
                      <div
                        key={doc.id}
                        className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleToggleStatus(doc)}
                                className={`w-4 h-4 rounded border flex items-center justify-center mr-1 ${
                                  doc.status === "done"
                                    ? "bg-emerald-500 border-emerald-500"
                                    : "bg-white border-slate-300"
                                }`}
                              >
                                {doc.status === "done" && (
                                  <span className="text-[10px] text-white">
                                    ✓
                                  </span>
                                )}
                              </button>
                              <span className="font-medium text-sm">
                                {doc.name}
                              </span>
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
                                obowiązkowy
                              </span>
                            </div>
                            {doc.description && (
                              <p className="text-xs text-slate-500 mt-1">
                                {doc.description}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Załączone pliki */}
                        <div className="mt-2 border-t border-slate-100 pt-2">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold text-slate-600">
                              Załączone pliki ({docFiles.length})
                            </span>
                          </div>
                          {docFiles.length === 0 ? (
                            <p className="text-xs text-slate-400">
                              Brak załączonych plików.
                            </p>
                          ) : (
                            <ul className="space-y-1 text-xs">
                              {docFiles.map((file) => (
                                <li
                                  key={file.id}
                                  className="flex items-center justify-between"
                                >
                                  <div className="flex items-center gap-2">
                                    <FileText className="w-3 h-3 text-slate-400" />
                                    <span>{file.original_name}</span>
                                    <span className="text-[10px] text-slate-400">
                                      ({Math.round(file.size / 1024)} kB)
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      {file.storage_location === "server"
                                        ? "Serwer"
                                        : "Tylko lokalnie"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        handleDownloadFile(file)
                                      }
                                      className="text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                                    >
                                      <Download className="w-3 h-3" />
                                      <span>Pobierz</span>
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteFile(file)}
                                      className="text-slate-400 hover:text-red-500 text-[11px]"
                                    >
                                      Usuń
                                    </button>
                                  </div>
                                </li>
                              ))}
                            </ul>
                          )}

                          {/* Upload */}
                          <div className="mt-2 flex items-center gap-2">
                            <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-600 hover:text-indigo-700">
                              <FileUp className="w-3 h-3" />
                              <span>
                                {uploadingId === doc.id
                                  ? "Wysyłanie..."
                                  : "Dodaj plik"}
                              </span>
                              <input
                                type="file"
                                accept=".pdf,.png,.jpg,.jpeg"
                                className="hidden"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleFileUpload(
                                      doc.id,
                                      file,
                                      storageLocation
                                    );
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
              )}
            </div>

            {/* Dodatkowe / wyjątkowe */}
            {extraDocs.length > 0 && (
              <div className="mt-4">
                {!showExtras ? (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">
                    <p className="mb-2">
                      Masz{" "}
                      <span className="font-semibold">
                        {extraDocs.length}
                      </span>{" "}
                      dokumentów dla sytuacji wyjątkowych (np. pełnomocnik,
                      cudzoziemiec, unieważnienie poprzedniego małżeństwa).
                    </p>
                    <button
                      type="button"
                      onClick={() => setShowExtras(true)}
                      className="px-3 py-1 rounded-lg bg-slate-900 text-white text-[11px] hover:bg-slate-800"
                    >
                      Pokaż dodatkowe dokumenty
                    </button>
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-xs font-semibold text-slate-600">
                        Dodatkowe dokumenty (w sytuacjach wyjątkowych)
                      </h3>
                      <button
                        type="button"
                        onClick={() => setShowExtras(false)}
                        className="text-[11px] text-slate-500 hover:text-slate-700"
                      >
                        Ukryj dodatkowe
                      </button>
                    </div>
                    <div className="space-y-3">
                      {extraDocs.map((doc) => {
                        const docFiles = files[doc.id] ?? [];
                        return (
                          <div
                            key={doc.id}
                            className="border border-slate-200 rounded-xl p-4 flex flex-col gap-2 bg-slate-50"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => handleToggleStatus(doc)}
                                    className={`w-4 h-4 rounded border flex items-center justify-center mr-1 ${
                                      doc.status === "done"
                                        ? "bg-emerald-500 border-emerald-500"
                                        : "bg-white border-slate-300"
                                    }`}
                                  >
                                    {doc.status === "done" && (
                                      <span className="text-[10px] text-white">
                                        ✓
                                      </span>
                                    )}
                                  </button>
                                  <span className="font-medium text-sm">
                                    {doc.name}
                                  </span>
                                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
                                    dodatkowy
                                  </span>
                                </div>
                                {doc.description && (
                                  <p className="text-xs text-slate-500 mt-1">
                                    {doc.description}
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Pliki */}
                            <div className="mt-2 border-t border-slate-100 pt-2">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-semibold text-slate-600">
                                  Załączone pliki ({docFiles.length})
                                </span>
                              </div>
                              {docFiles.length === 0 ? (
                                <p className="text-xs text-slate-400">
                                  Brak załączonych plików.
                                </p>
                              ) : (
                                <ul className="space-y-1 text-xs">
                                  {docFiles.map((file) => (
                                    <li
                                      key={file.id}
                                      className="flex items-center justify-between"
                                    >
                                      <div className="flex items-center gap-2">
                                        <FileText className="w-3 h-3 text-slate-400" />
                                        <span>{file.original_name}</span>
                                        <span className="text-[10px] text-slate-400">
                                          ({Math.round(file.size / 1024)} kB)
                                        </span>
                                        <span className="text-[10px] text-slate-500">
                                          {file.storage_location === "server"
                                            ? "Serwer"
                                            : "Tylko lokalnie"}
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDownloadFile(file)
                                          }
                                          className="text-slate-400 hover:text-indigo-600 flex items-center gap-1"
                                        >
                                          <Download className="w-3 h-3" />
                                          <span>Pobierz</span>
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() =>
                                            handleDeleteFile(file)
                                          }
                                          className="text-slate-400 hover:text-red-500 text-[11px]"
                                        >
                                          Usuń
                                        </button>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}

                              {/* Upload */}
                              <div className="mt-2 flex items-center gap-2">
                                <label className="flex items-center gap-2 cursor-pointer text-xs text-indigo-600 hover:text-indigo-700">
                                  <FileUp className="w-3 h-3" />
                                  <span>
                                    {uploadingId === doc.id
                                      ? "Wysyłanie..."
                                      : "Dodaj plik"}
                                  </span>
                                  <input
                                    type="file"
                                    accept=".pdf,.png,.jpg,.jpeg"
                                    className="hidden"
                                    onChange={(e) => {
                                      const file = e.target.files?.[0];
                                      if (file) {
                                        handleFileUpload(
                                          doc.id,
                                          file,
                                          storageLocation
                                        );
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
    </div>
  );
}
