import React, { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { Document as DocType, DocumentPayload } from "../types/document";
import { CheckCircle, FileText, FileUp } from "lucide-react";

/** 🌙 Modal */
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
      {/* overlay do zamknięcia */}
      <div
        onClick={onClose}
        className="absolute inset-0 cursor-pointer"
        style={{ background: "transparent" }}
      />

      {/* zawartość */}
      <div
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl p-6 animate-fadeIn overflow-y-auto max-h-[90vh]"
        style={{
          zIndex: 10000000,
          position: "relative",
        }}
      >
        {title && (
          <h3 className="text-xl font-semibold mb-4 text-center">{title}</h3>
        )}
        {children}
      </div>
    </div>,
    modalRoot
  );
};

export default function Documents() {
  const { id: eventId } = useParams<{ id: string }>();
  const [documents, setDocuments] = useState<DocType[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [showExtraModal, setShowExtraModal] = useState(false);
  const [selectedExtras, setSelectedExtras] = useState<Record<string, boolean>>({});
  const [ceremonyType, setCeremonyType] = useState<"civil" | "church" | "concordat">("civil");

  // 📋 Bazowe zestawy dla każdego typu
  const baseDocsByType: Record<string, DocType[]> = {
    civil: [
      { id: "base-id", event_id: eventId!, name: "Dowód osobisty", description: "Do okazania w USC.", status: "pending", attachments: [] },
      { id: "base-fee", event_id: eventId!, name: "Dowód opłaty skarbowej", description: "Opłata 84 zł w USC lub przelewem.", status: "pending", attachments: [] },
      { id: "base-statement", event_id: eventId!, name: "Zapewnienie o braku przeszkód", description: "Podpisywane w USC podczas wizyty.", status: "pending", attachments: [] },
    ],
    church: [
      { id: "base-id", event_id: eventId!, name: "Dowody osobiste narzeczonych", description: "Do poprawnego spisania danych osobowych.", status: "pending", attachments: [] },
      { id: "base-baptism", event_id: eventId!, name: "Metryka chrztu świętego", description: "Z parafii chrztu, ważna 6 miesięcy.", status: "pending", attachments: [] },
      { id: "base-course", event_id: eventId!, name: "Zaświadczenie o ukończeniu katechez", description: "Kurs, poradnia, dzień skupienia.", status: "pending", attachments: [] },
    ],
    concordat: [
      { id: "base-id", event_id: eventId!, name: "Dowód osobisty", description: "Do okazania w USC i parafii.", status: "pending", attachments: [] },
      { id: "base-usc", event_id: eventId!, name: "Zaświadczenie z USC", description: "O braku przeszkód – 3 egzemplarze, ważne 6 miesięcy.", status: "pending", attachments: [] },
      { id: "base-baptism", event_id: eventId!, name: "Świadectwa chrztu", description: "Z parafii chrztu narzeczonych.", status: "pending", attachments: [] },
    ],
  };

  const optionalExtras = [
    { key: "court_permission", name: "Zezwolenie sądu", description: "Jeśli wymagane – dostarczone orzeczenie sądu." },
    { key: "proxy_permission", name: "Pełnomocnictwo", description: "Jeśli ślub zawierany przez pełnomocnika." },
    { key: "foreign_doc", name: "Dokument cudzoziemca", description: "Zaświadczenie o zdolności do zawarcia małżeństwa." },
  ];

  const loadDocuments = useCallback(async () => {
    if (!eventId) return;
    setLoading(true);
    try {
      const docs = await api.getDocuments(eventId);
      const safeDocs = docs.map((d) => ({
        ...d,
        attachments: Array.isArray(d.attachments) ? d.attachments : [],
      }));
      setDocuments(safeDocs);
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
      const updated = await api.updateDocument(doc.id, { status: doc.status === "done" ? "pending" : "done" });
      setDocuments((prev) => prev.map((d) => (d.id === doc.id ? updated : d)));
    } catch (err) {
      console.error("❌ Błąd aktualizacji statusu:", err);
    }
  };

  const handleFileUpload = async (docId: string, file: File) => {
    setUploadingId(docId);
    try {
      const uploaded = await api.uploadDocument(docId, file);
      setDocuments((prev) => prev.map((d) => (d.id === docId ? uploaded : d)));
    } catch (err) {
      console.error("❌ Błąd uploadu:", err);
    } finally {
      setUploadingId(null);
    }
  };

  /** 🔹 Dodawanie/usuwanie dokumentów dodatkowych */
  const handleToggleExtraDoc = async (key: string) => {
    if (!eventId) return;
    const extra = optionalExtras.find((e) => e.key === key);
    if (!extra) return;

    const alreadyAdded = documents.some((d) => d.name === extra.name);
    const selected = !!selectedExtras[key];

    if (alreadyAdded || selected) {
      setSelectedExtras((prev) => ({ ...prev, [key]: false }));
      setDocuments((prev) => prev.filter((d) => d.name !== extra.name));
    } else {
      setSelectedExtras((prev) => ({ ...prev, [key]: true }));
      const payload: DocumentPayload = {
        event_id: eventId,
        name: extra.name,
        description: extra.description,
        status: "pending",
        type: ceremonyType,
      };

      try {
        const created = await api.createDocument(payload);
        setDocuments((prev) => [...prev, created]);
      } catch {
        setDocuments((prev) => [
          ...prev,
          { id: crypto.randomUUID(), event_id: eventId, name: extra.name, description: extra.description, status: "pending", attachments: [] },
        ]);
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 🧭 Wybór typu ślubu */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold">📂 Dokumenty – {ceremonyType === "civil" ? "Ślub cywilny" : ceremonyType === "church" ? "Ślub kościelny" : "Ślub konkordatowy"}</h1>
          <p className="text-gray-600 text-sm mt-1">
            Lista dokumentów wymaganych w zależności od rodzaju ceremonii.
          </p>
        </div>
        <select
          value={ceremonyType}
          onChange={(e) => setCeremonyType(e.target.value as "civil" | "church" | "concordat")}
          className="border p-2 rounded"
        >
          <option value="civil">Ślub cywilny</option>
          <option value="church">Ślub kościelny</option>
          <option value="concordat">Ślub konkordatowy</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button onClick={() => setShowExtraModal(true)} className="bg-indigo-600 text-white px-4 py-2 rounded">Dodatkowe dokumenty</button>
        <button onClick={loadDocuments} className="bg-gray-100 border px-3 py-2 rounded">Odśwież</button>
      </div>

      {loading ? (
        <div>Ładowanie dokumentów…</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {[...baseDocsByType[ceremonyType], ...documents].map((document) => (
            <div
              key={document.id}
              className={`border rounded-2xl p-4 shadow-sm bg-white flex flex-col justify-between ${
                document.status === "done" ? "border-green-400" : "border-gray-200"
              }`}
            >
              <div>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" /> {document.name}
                  </h2>
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
                </div>
                <p className="text-sm text-gray-500 mt-2">{document.description}</p>
                {(document.attachments ?? []).length > 0 && (
                  <div className="mt-3 space-y-1">
                    {(document.attachments ?? []).map((a) => (
                      <a
                        key={a.id}
                        href={`http://localhost:4000${a.url}`}
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
              <div className="mt-3 flex items-center gap-2">
                <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700 hover:text-blue-600">
                  <FileUp className="w-4 h-4" />
                  <span>{uploadingId === document.id ? "Wysyłanie..." : "Dodaj plik"}</span>
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleFileUpload(document.id, file);
                    }}
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      )}

      {showExtraModal && (
        <Modal onClose={() => setShowExtraModal(false)} title="Dodatkowe dokumenty">
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Zaznacz dokumenty, które chcesz dodać do listy (np. gdy dotyczą Twojej sytuacji).
            </p>
            <div className="grid gap-2">
              {optionalExtras.map((ex) => {
                const alreadyAdded = documents.some((d) => d.name === ex.name);
                const selected = !!selectedExtras[ex.key];

                return (
                  <label
                    key={ex.key}
                    className={`flex items-start gap-3 p-3 border rounded cursor-pointer
                      ${selected ? "bg-blue-100 border-blue-400" : ""}
                      ${alreadyAdded && !selected ? "bg-green-100 border-green-400" : ""}
                      hover:bg-gray-50`}
                  >
                    <input
                      type="checkbox"
                      checked={selected || alreadyAdded}
                      onChange={() => handleToggleExtraDoc(ex.key)}
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{ex.name}</div>
                      <div className="text-xs text-gray-500">{ex.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowExtraModal(false)} className="px-3 py-2 border rounded">
                Zapisz
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
