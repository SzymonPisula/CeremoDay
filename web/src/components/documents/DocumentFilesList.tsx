// CeremoDay/web/src/components/documents/DocumentFilesList.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eye, Trash2, Upload, Smartphone, Cloud, Loader2 } from "lucide-react";

import { api } from "../../lib/api";
import { useUiStore } from "../../store/ui";
import type { DocumentFile, StorageLocation } from "../../types/document";
import PreviewModal from "../preview/PreviewModal";

interface Props {
  documentId: string;
  documentName?: string;
}

const ALLOWED_MIME = new Set(["application/pdf", "image/jpeg", "image/png"]);
const ALLOWED_EXT = new Set(["pdf", "jpg", "jpeg", "png"]);

function isAllowedFile(file: File) {
  const mime = String(file.type || "").toLowerCase().trim();
  if (mime && ALLOWED_MIME.has(mime)) return true;

  const name = String(file.name || "");
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  if (ext && ALLOWED_EXT.has(ext)) return true;

  return false;
}

export default function DocumentFilesList({ documentId, documentName }: Props) {
  const toast = useUiStore((s) => s.toast);
  const confirmAsync = useUiStore((s) => s.confirmAsync);

  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<StorageLocation | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewKind, setPreviewKind] = useState<"image" | "pdf" | "unknown">("unknown");
  const previewUrlRef = useRef<string | null>(null);

  const inputServerRef = useRef<HTMLInputElement | null>(null);
  const inputLocalRef = useRef<HTMLInputElement | null>(null);

  const docLabel = (documentName?.trim() ? documentName.trim() : "Dokument") as string;

  const clearInputs = () => {
    if (inputServerRef.current) inputServerRef.current.value = "";
    if (inputLocalRef.current) inputLocalRef.current.value = "";
  };

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getDocumentFiles(documentId);
      setFiles(Array.isArray(data) ? data : []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się wczytać plików.";
      toast({ tone: "danger", title: "Błąd plików", message: msg });
    } finally {
      setLoading(false);
    }
  }, [documentId, toast]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  // Sprzątanie blob URLs na unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch {
          // noop
        }
        previewUrlRef.current = null;
      }
    };
  }, []);

  const handleUpload = async (file: File, storage: StorageLocation) => {
    if (!isAllowedFile(file)) {
      toast({
        tone: "danger",
        title: "Nieprawidłowy plik",
        message: "Dozwolone formaty: PDF, JPG, PNG.",
      });
      clearInputs();
      return;
    }

    try {
      setUploading(storage);

      // backend bywa różny: czasem zwraca tylko utworzony rekord,
      // ale i tak odświeżamy listę żeby było spójnie
      await api.uploadDocumentFile(documentId, file, storage);
      await fetchFiles();

      toast({
        tone: "success",
        title: "Dodano plik",
        message: `„${file.name}” → „${docLabel}”`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się dodać pliku.";
      toast({ tone: "danger", title: "Nie udało się dodać pliku", message: msg });
    } finally {
      setUploading(null);
      clearInputs();
    }
  };

  const handleDownload = async (fileId: string, name: string) => {
    try {
      const blob = await api.downloadDocumentFile(fileId);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = name || "plik";
      document.body.appendChild(a);
      a.click();
      a.remove();

      URL.revokeObjectURL(url);

      toast({
        tone: "info",
        title: "Pobieranie",
        message: `„${name || "plik"}”`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się pobrać pliku.";
      toast({ tone: "danger", title: "Nie udało się pobrać", message: msg });
    }
  };

  const handlePreview = async (f: DocumentFile) => {
    try {
      const blob = await api.downloadDocumentFile(f.id);
      const url = URL.createObjectURL(blob);

      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch {
          // noop
        }
      }

      previewUrlRef.current = url;
      setPreviewUrl(url);
      setPreviewName(f.original_name);

      const mime = String(f.mime_type || "").toLowerCase();
      if (mime.includes("pdf")) setPreviewKind("pdf");
      else if (mime.startsWith("image/")) setPreviewKind("image");
      else setPreviewKind("unknown");

      setPreviewOpen(true);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się otworzyć podglądu.";
      toast({ tone: "danger", title: "Błąd podglądu", message: msg });
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch {
        // noop
      }
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewName("");
    setPreviewKind("unknown");
  };

  const askDelete = async (f: DocumentFile) => {
    const ok = await confirmAsync({
      title: "Usunąć plik?",
      message: `Plik „${f.original_name}” zostanie trwale usunięty z dokumentu „${docLabel}”.`,
      confirmText: "Usuń plik",
      cancelText: "Anuluj",
      tone: "danger",
    });

    if (!ok) return;

    try {
      setDeletingId(f.id);
      await api.deleteDocumentFile(f.id);
      setFiles((prev) => prev.filter((x) => x.id !== f.id));

      toast({
        tone: "success",
        title: "Usunięto plik",
        message: `„${f.original_name}”`,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się usunąć pliku.";
      toast({ tone: "danger", title: "Nie udało się usunąć pliku", message: msg });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="mt-4 space-y-2">
      {/* Preview modal */}
      {previewUrl && (
        <PreviewModal
          open={previewOpen}
          onClose={closePreview}
          title="Podgląd pliku"
          url={previewUrl}
          filename={previewName}
          forceKind={previewKind}
        />
      )}

      {/* Upload */}
      <div className="flex flex-wrap gap-4 items-center">
        <label className="inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer hover:text-white transition">
          {uploading === "server" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>Dodaj plik</span>
          <input
            ref={inputServerRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            disabled={uploading !== null}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f, "server");
            }}
          />
        </label>

        <label className="inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer hover:text-white transition">
          {uploading === "local" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Smartphone className="w-4 h-4" />
          )}
          <span>Dodaj lokalnie</span>
          <input
            ref={inputLocalRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
            disabled={uploading !== null}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f, "local");
            }}
          />
        </label>

        {loading && (
          <span className="text-xs text-white/45 inline-flex items-center gap-2">
            <Loader2 className="w-3 h-3 animate-spin" /> wczytywanie plików…
          </span>
        )}
      </div>

      {/* Lista */}
      {files.map((f) => {
        const isDeleting = deletingId === f.id;

        return (
          <div
            key={f.id}
            className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl border border-white/10 bg-black/20 text-xs"
          >
            <div className="flex items-center gap-2 min-w-0">
              {f.storage_location === "local" ? (
                <Smartphone className="w-3 h-3 text-amber-300" />
              ) : (
                <Cloud className="w-3 h-3 text-sky-300" />
              )}

              <button
                type="button"
                onClick={() => void handlePreview(f)}
                className="truncate text-white/80 hover:text-white text-left"
                title="Podgląd"
              >
                {f.original_name}
              </button>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => void handlePreview(f)}
                className="text-white/60 hover:text-white"
                title="Podgląd"
              >
                <Eye className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => void handleDownload(f.id, f.original_name)}
                className="text-white/60 hover:text-white"
                title="Pobierz"
              >
                <Download className="w-4 h-4" />
              </button>

              <button
                type="button"
                disabled={isDeleting}
                onClick={() => void askDelete(f)}
                className="text-white/40 hover:text-red-300 disabled:opacity-60"
                title="Usuń"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        );
      })}

      {!loading && files.length === 0 && <p className="text-xs text-white/40">Brak plików</p>}
    </div>
  );
}
