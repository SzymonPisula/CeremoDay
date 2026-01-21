import { useCallback, useEffect, useRef, useState } from "react";
import { Download, Eye, Trash2, Upload, Smartphone, Cloud, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import type { DocumentFile, StorageLocation } from "../../types/document";
import PreviewModal from "../preview/PreviewModal";

interface Props {
  documentId: string;
}

export default function DocumentFilesList({ documentId }: Props) {
  const [files, setFiles] = useState<DocumentFile[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState<StorageLocation | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string>("");
  const [previewKind, setPreviewKind] = useState<"image" | "pdf" | "unknown">("unknown");
  const previewUrlRef = useRef<string | null>(null);

  const inputServerRef = useRef<HTMLInputElement | null>(null);
  const inputLocalRef = useRef<HTMLInputElement | null>(null);

  const fetchFiles = useCallback(async () => {
    try {
      setLoading(true);
      const data = await api.getDocumentFiles(documentId);
      setFiles(data);
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
    try {
      setUploading(storage);
      const created = await api.uploadDocumentFile(documentId, file, storage);
      setFiles((prev) => [...prev, created]);
    } finally {
      setUploading(null);
      if (inputServerRef.current) inputServerRef.current.value = "";
      if (inputLocalRef.current) inputLocalRef.current.value = "";
    }
  };

  const handleDownload = async (fileId: string, name: string) => {
    const blob = await api.downloadDocumentFile(fileId);
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();

    URL.revokeObjectURL(url);
  };

  const handlePreview = async (f: DocumentFile) => {
    const blob = await api.downloadDocumentFile(f.id);
    const url = URL.createObjectURL(blob);

    // revoke poprzedniego URL
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

  const handleDelete = async (fileId: string) => {
    if (!confirm("Usunąć plik?")) return;
    await api.deleteDocumentFile(fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));
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
      <div className="flex flex-wrap gap-4">
        <label className="inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer hover:text-white transition">
          {uploading === "server" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          <span>Dodaj plik</span>
          <input
            ref={inputServerRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleUpload(f, "server");
            }}
          />
        </label>

        <label className="inline-flex items-center gap-2 text-xs text-white/70 cursor-pointer hover:text-white transition">
          {uploading === "local" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Smartphone className="w-4 h-4" />}
          <span>Dodaj lokalnie</span>
          <input
            ref={inputLocalRef}
            type="file"
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
              onClick={() => void handleDelete(f.id)}
              className="text-white/40 hover:text-red-300"
              title="Usuń"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}

      {!loading && files.length === 0 && (
        <p className="text-xs text-white/40">Brak plików</p>
      )}
    </div>
  );
}
