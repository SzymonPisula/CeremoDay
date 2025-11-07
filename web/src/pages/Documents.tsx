import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Document as DocType, DocumentPayload } from "../types/document";
import { CheckCircle, FileText, Calendar, FileUp } from "lucide-react";

/** Re-usable Modal (ten sam styl co w Guests) */
const Modal: React.FC<{ onClose: () => void; title?: string; children: React.ReactNode }> = ({
  onClose,
  title,
  children,
}) => {
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
      className="fixed inset-0 flex items-center justify-center z-[9999999]"
      style={{
        backgroundColor: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(3px)",
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div onClick={onClose} className="absolute inset-0 cursor-pointer" style={{ background: "transparent" }} />
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fadeIn overflow-y-auto max-h-[90vh]"
        style={{ zIndex: 10000000, position: "relative" }}
      >
        {title && <h3 className="text-xl font-semibold mb-4 text-center">{title}</h3>}
        {children}
      </div>
    </div>,
    modalRoot
  );
};

export default function Documents() {
  const { id: eventId } = useParams<{ id: string }>(); // zgodnie z trasą /events/:id/...
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [showExtraModal, setShowExtraModal] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>({});

  // Lista dodatkowych (opcjonalnych) dokumentów — użytkownik może je "odkryć"
  const optionalExtras = [
    { key: "court_permission", name: "Zezwolenie sądu (jeśli wymagane)", description: "Zezwolenie sądu na zawarcie małżeństwa." },
    { key: "proxy_power", name: "Pełnomocnictwo (jeśli dotyczy)", description: "Pełnomocnictwo dla osoby zawierającej małżeństwo w imieniu." },
    { key: "foreign_act", name: "Zagraniczny akt urodzenia/małżeństwa", description: "Dokumenty zagraniczne wymagające tłumaczeń." },
    { key: "foreigner_cert", name: "Dokument cudzoziemca o zdolności", description: "Potwierdzenie, że cudzoziemiec może zawrzeć małżeństwo." },
    { key: "sworn_translation", name: "Tłumaczenie przysięgłe", description: "Tłumaczenie dokumentów sporządzonych w obcym języku." },
    { key: "outside_uscs_application", name: "Wniosek o ślub poza USC (jeśli dotyczy)", description: "Wniosek o zawarcie ślubu poza urzędem." },
  ];

  const loadDocuments = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const docs = await api.getDocuments(eventId);
      setDocuments(docs || []);
    } catch (err) {
      console.error("❌ Błąd ładowania dokumentów:", err);
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  const toggleStatus = async (doc: DocType) => {
    try {
      const updated = await api.updateDocument(doc.id, {
        ...doc,
        status: doc.status === "done" ? "pending" : "done",
      } as Partial<DocType>);
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
    } catch (err) {
      console.error("❌ Błąd aktualizacji statusu:", err);
    }
  };

  const handleFileUpload = async (docId: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    setUploadingId(docId);
    try {
      const res = await api.uploadDocument(docId, formData); // oczekujemy { filePath: '/uploads/...' } albo pełnego załącznika
      // Zaktualizuj attachmenty wywołując updateDocument lub patch
      // Spróbujemy pobrać obecny dokument i dodać attachment
      const doc = documents.find((d) => d.id === docId);
      const attachmentUrl = res?.filePath ?? res?.url ?? null;
      if (!attachmentUrl) {
        console.warn("Upload zwrócił brak ścieżki pliku:", res);
      }
      const updatedPayload: Partial<DocType> = {
        attachments: [...(doc?.attachments || []), { id: crypto.randomUUID(), document_id: docId, name: file.name, url: attachmentUrl, created_at: new Date().toISOString() }],
      };
      const updatedDoc = await api.updateDocument(docId, updatedPayload);
      setDocuments((prev) => prev.map((d) => (d.id === docId ? updatedDoc : d)));
    } catch (err) {
      console.error("❌ Błąd uploadu:", err);
    } finally {
      setUploadingId(null);
    }
  };

  // Dodawanie wybranych dodatkowych dokumentów (z modalu)
  const handleAddSelectedExtraDocs = async () => {
  if (!eventId) return;
  const toAdd = optionalExtras.filter((e) => selectedExtras[e.key]);
  if (toAdd.length === 0) {
    setShowExtraModal(false);
    return;
  }

  try {
    const createdDocs: DocType[] = [];

    for (const e of toAdd) {
      const payload: DocumentPayload = {
        event_id: eventId,
        name: e.name,
        description: e.description ?? "",
        status: "pending",
        type: "civil",
        due_date: undefined,
        notes: undefined,
      };

      // Wywołujemy API i tworzymy dokument
      const created = await api.createDocument(payload);
      createdDocs.push(created);
    }

    // 🔥 Zamiast reloadu — bezpośrednio aktualizujemy stan:
    setDocuments((prev) => [...prev, ...createdDocs]);

  } catch (err) {
    console.error("❌ Błąd tworzenia dodatkowych dokumentów:", err);
  } finally {
    setShowExtraModal(false);
    setSelectedExtras({});
  }
};


  

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold">📂 Dokumenty – Ślub cywilny</h1>
          <p className="text-gray-600 max-w-xl mt-1">
            Lista dokumentów wymaganych do ślubu cywilnego. Możesz dodać skany (PDF/JPG/PNG), oznaczyć dokument jako załatwiony lub dołączyć notatki.
          </p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => setShowExtraModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded">
            Odkryj dodatkowe dokumenty
          </button>
          <button
            onClick={loadDocuments}
            className="bg-gray-100 border px-3 py-2 rounded"
            title="Odśwież"
          >
            Odśwież
          </button>
        </div>
      </div>

      {loading ? (
  <div>Ładowanie dokumentów…</div>
) : (
  <div className="grid gap-4 md:grid-cols-2">
    {(
      [
        {
          id: `pref-dowod-${eventId}`,
          event_id: eventId!,
          name: "Dowód osobisty lub paszport",
          description: "Dokument tożsamości do okazania w USC.",
          status: "pending",
          attachments: [],
          due_date: undefined,
          created_at: undefined,
        },
        {
          id: `pref-oplata-${eventId}`,
          event_id: eventId!,
          name: "Dowód opłaty skarbowej",
          description: "Dowód wpłaty w kasie lub przelewu na konto urzędu.",
          status: "pending",
          attachments: [],
          due_date: undefined,
          created_at: undefined,
        },
      ] as Partial<DocType>[]
    )
      // połącz placeholdery z faktycznymi dokumentami
      .concat(documents as DocType[])
      // jawnie typujemy jako DocType, aby TS wiedział co renderujemy
      .map((doc, index) => {
        const document = doc as DocType;
        const isPlaceholder = document.id.startsWith("pref-");

        return (
          <div
            key={document.id || index}
            className={`border rounded-2xl p-4 shadow-sm bg-white flex flex-col justify-between ${
              document.status === "done" ? "border-green-400" : "border-gray-200"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium flex items-center gap-2">
                  <FileText className="w-5 h-5 text-blue-600" />
                  {document.name}
                </h2>

                {!isPlaceholder && (
                  <button
                    onClick={() => toggleStatus(document)}
                    className={`flex items-center gap-1 px-3 py-1 rounded-full text-sm ${
                      document.status === "done"
                        ? "bg-green-100 text-green-600"
                        : "bg-gray-100 text-gray-600"
                    }`}
                  >
                    <CheckCircle className="w-4 h-4" />
                    {document.status === "done" ? "Załatwione" : "Do zrobienia"}
                  </button>
                )}
              </div>

              {document.description && (
                <p className="text-sm text-gray-500 mt-2">{document.description}</p>
              )}

              {document.due_date && (
                <p className="flex items-center gap-2 text-sm text-gray-500 mt-2">
                  <Calendar className="w-4 h-4" />
                  Termin: {new Date(document.due_date).toLocaleDateString()}
                </p>
              )}

              {Array.isArray(document.attachments) && document.attachments.length > 0 && (
                <div className="mt-3 space-y-1">
                  {document.attachments.map((a) => (
                    <a
                      key={a.id}
                      href={a.url.startsWith("http") ? a.url : `http://localhost:4000${a.url}`}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-blue-600 text-sm block underline"
                    >
                      📎 {a.name}
                    </a>
                  ))}
                </div>
              )}
            </div>

            {!isPlaceholder && (
              <div className="mt-3 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-blue-600">
                  <FileUp className="w-4 h-4" />
                  <span>{uploadingId === document.id ? "Wysyłanie..." : "Dodaj plik"}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(document.id, file);
                    }}
                    className="hidden"
                  />
                </label>

                {document.created_at && (
                  <div className="text-sm text-gray-500">
                    Dodano: {new Date(document.created_at).toLocaleDateString()}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
  </div>
)}



      {/* === MODAL: odkryj dodatkowe dokumenty === */}
      {showExtraModal && (
        <Modal onClose={() => setShowExtraModal(false)} title="Odkryj dodatkowe dokumenty">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Zaznacz dokumenty, które chcesz dodać do listy (np. gdy dotyczą Twojej sytuacji).
            </p>

            <div className="grid gap-2">
              {optionalExtras.map((ex) => (
                <label key={ex.key} className="flex items-start gap-3 p-3 border rounded hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!selectedExtras[ex.key]}
                    onChange={(e) => setSelectedExtras((prev) => ({ ...prev, [ex.key]: e.target.checked }))}
                    className="mt-1"
                  />
                  <div>
                    <div className="font-medium">{ex.name}</div>
                    <div className="text-xs text-gray-500">{ex.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowExtraModal(false)} className="px-3 py-2 border rounded">
                Anuluj
              </button>
              <button onClick={handleAddSelectedExtraDocs} className="bg-blue-600 text-white px-3 py-2 rounded">
                Dodaj wybrane
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
