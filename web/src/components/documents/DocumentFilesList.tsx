// /CeremoDay/web/src/components/documents/DocumentFilesList.tsx
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Download,
  Eye,
  Trash2,
  Upload,
  Smartphone,
  Cloud,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import { api } from "../../lib/api";
import type { DocumentFile, StorageLocation } from "../../types/document";
import PreviewModal from "../preview/PreviewModal";

interface Props {
  documentId: string;
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

type UiDialog =
  | { open: false }
  | {
      open: true;
      kind: "confirm" | "info";
      title: string;
      message: string;
      confirmText?: string;
      cancelText?: string;
      danger?: boolean;
      onConfirm?: () => void | Promise<void>;
    };

export default function DocumentFilesList({ documentId }: Props) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<StorageLocation | null>(null);
  const [dialog, setDialog] = useState<UiDialog>({ open: false });

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewKind, setPreviewKind] = useState<"image" | "pdf" | "unknown">(
    "unknown"
  );
  const previewUrlRef = useRef<string | null>(null);

  const inputServerRef = useRef<HTMLInputElement | null>(null);
  const inputLocalRef = useRef<HTMLInputElement | null>(null);

  const openInfo = (title: string, message: string) => {
    setDialog({ open: true, kind: "info", title, message, confirmText: "OK" });
  };

  const openConfirm = (
    cfg: Omit<Extract<UiDialog, { open: true }>, "open">
  ) => {
    setDialog({ open: true, ...cfg });
  };

  const closeDialog = () => setDialog({ open: false });

  // Scroll-lock tła gdy dialog otwarty
  useEffect(() => {
    if (!dialog.open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [dialog.open]);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getDocumentFiles(documentId);
      setFiles(data);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się wczytać plików.";
      openInfo("Błąd", msg);
    } finally {
      setLoading(false);
    }
  }, [documentId]);

  useEffect(() => {
    void fetchFiles();
  }, [fetchFiles]);

  // Sprzątanie blob URLs na unmount
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch (e) {
          void e;
        }
        previewUrlRef.current = null;
      }
    };
  }, []);

  const handleUpload = async (file: File, storage: StorageLocation) => {
    if (!isAllowedFile(file)) {
      openInfo("Nieprawidłowy plik", "Dozwolone formaty: PDF, JPG, PNG.");
      if (inputServerRef.current) inputServerRef.current.value = "";
      if (inputLocalRef.current) inputLocalRef.current.value = "";
      return;
    }

    try {
      setUploading(storage);
      const created = await api.uploadDocumentFile(documentId, file, storage);
      setFiles((prev) => [...prev, created]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się dodać pliku.";
      openInfo("Błąd", msg);
    } finally {
      setUploading(null);
      if (inputServerRef.current) inputServerRef.current.value = "";
      if (inputLocalRef.current) inputLocalRef.current.value = "";
    }
  };

  const handleDownload = async (fileId: string, name: string) => {
    try {
      const blob = await api.downloadDocumentFile(fileId);
      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      a.click();

      URL.revokeObjectURL(url);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Nie udało się pobrać pliku.";
      openInfo("Błąd", msg);
    }
  };

  const handlePreview = async (f: DocumentFile) => {
    try {
      const blob = await api.downloadDocumentFile(f.id);
      const url = URL.createObjectURL(blob);

      if (previewUrlRef.current) {
        try {
          URL.revokeObjectURL(previewUrlRef.current);
        } catch (e) {
          void e;
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
      openInfo("Błąd", msg);
    }
  };

  const closePreview = () => {
    setPreviewOpen(false);
    if (previewUrlRef.current) {
      try {
        URL.revokeObjectURL(previewUrlRef.current);
      } catch (e) {
        void e;
      }
      previewUrlRef.current = null;
    }
    setPreviewUrl(null);
    setPreviewName("");
    setPreviewKind("unknown");
  };

  const askDelete = (f: DocumentFile) => {
    openConfirm({
      kind: "confirm",
      title: "Usunąć plik?",
      message: `Plik "${f.original_name}" zostanie trwale usunięty z tego dokumentu.`,
      confirmText: "Usuń plik",
      cancelText: "Anuluj",
      danger: true,
      onConfirm: async () => {
        try {
          await api.deleteDocumentFile(f.id);
          setFiles((prev) => prev.filter((x) => x.id !== f.id));
          closeDialog();
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Nie udało się usunąć pliku.";
          openInfo("Błąd", msg);
        }
      },
    });
  };

  const dialogNode =
    dialog.open
      ? createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/60" onClick={closeDialog} />
            <div className="absolute inset-0 grid place-items-center p-4">
              <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#0b1b14] shadow-[0_30px_120px_rgba(0,0,0,0.55)] overflow-hidden">
                <div className="flex items-start justify-between gap-4 p-5 border-b border-white/10">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 h-9 w-9 rounded-xl border border-white/10 bg-white/5 grid place-items-center">
                      <AlertTriangle
                        className={
                          dialog.kind === "confirm" && dialog.danger
                            ? "w-4 h-4 text-red-200"
                            : "w-4 h-4 text-[#d7b45a]"
                        }
                      />
                    </div>
                    <div>
                      <div className="text-white font-semibold">{dialog.title}</div>
                      <div className="text-xs text-white/60 mt-1">{dialog.message}</div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={closeDialog}
                    className="h-9 w-9 rounded-lg border border-white/10 bg-white/5 grid place-items-center text-white/70 hover:text-white"
                    aria-label="Zamknij"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-5 flex items-center justify-end gap-2">
                  {dialog.kind === "confirm" && (
                    <button
                      type="button"
                      onClick={closeDialog}
                      className="px-4 py-2 rounded-lg border border-white/10 bg-white/5 text-sm text-white/70 hover:text-white"
                    >
                      {dialog.cancelText ?? "Anuluj"}
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={async () => {
                      if (dialog.kind === "info") {
                        closeDialog();
                        return;
                      }
                      if (dialog.onConfirm) await dialog.onConfirm();
                    }}
                    className={
                      "px-4 py-2 rounded-lg text-sm font-semibold disabled:opacity-60 " +
                      (dialog.kind === "confirm" && dialog.danger
                        ? "border border-red-400/25 bg-red-500/10 text-red-100 hover:bg-red-500/15"
                        : "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14]")
                    }
                  >
                    {dialog.kind === "info"
                      ? dialog.confirmText ?? "OK"
                      : dialog.confirmText ?? "Potwierdź"}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="mt-4 space-y-2">
      {/* Portal dialog */}
      {dialogNode}

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
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer hover:text-white transition">
          {uploading === "server" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Upload className="w-4 h-4" />
          )}
          <span>Dodaj plik</span>
          <input
            ref={inputServerRef}
            type="file"
            accept="application/pdf,image/jpeg,image/png"
            className="hidden"
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
      {files.map((f) => (
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
              onClick={() => askDelete(f)}
              className="text-white/40 hover:text-red-300"
              title="Usuń"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {!loading && files.length === 0 && <p className="text-xs text-white/40">Brak plików</p>}
    </div>
  );
}
