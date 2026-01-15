import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Download, ExternalLink, FileText, Image as ImageIcon, X, ZoomIn, ZoomOut } from "lucide-react";
import { guessPreviewKind } from "./previewUtils";

type PreviewKind = "image" | "pdf" | "unknown";

type Props = {
  open: boolean;
  onClose: () => void;

  /** Tytuł w nagłówku modala */
  title?: string;

  /**
   * URL do pliku (może być absolute lub relative, np. z API).
   * Jeśli relative, podaj baseUrl.
   */
  url: string;

  /** Opcjonalnie: nazwa pliku do wyświetlenia */
  filename?: string;

  /** Jeśli url jest relative (np. "/uploads/x.pdf"), podaj BASE_URL */
  baseUrl?: string;

  /** Wymuś typ, jeśli wiesz na pewno */
  forceKind?: PreviewKind;
};

function ensureModalRoot() {
  const existing = document.getElementById("modal-root");
  if (existing) return existing;
  const div = document.createElement("div");
  div.id = "modal-root";
  document.body.appendChild(div);
  return div;
}

function joinUrl(baseUrl: string | undefined, url: string) {
  if (!baseUrl) return url;
  if (/^https?:\/\//i.test(url)) return url;
  // ujednolicamy slashe
  const b = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const u = url.startsWith("/") ? url : `/${url}`;
  return `${b}${u}`;
}

export default function PreviewModal({
  open,
  onClose,
  title,
  url,
  filename,
  baseUrl,
  forceKind,
}: Props) {
  const [scale, setScale] = useState(1);

  const fullUrl = useMemo(() => joinUrl(baseUrl, url), [baseUrl, url]);

  const kind: PreviewKind = useMemo(() => {
    if (forceKind) return forceKind;
    return guessPreviewKind(fullUrl);
  }, [forceKind, fullUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if ((e.ctrlKey || e.metaKey) && (e.key === "+" || e.key === "=")) {
        e.preventDefault();
        setScale((s) => Math.min(2.25, +(s + 0.1).toFixed(2)));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "-") {
        e.preventDefault();
        setScale((s) => Math.max(0.6, +(s - 0.1).toFixed(2)));
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "0") {
        e.preventDefault();
        setScale(1);
      }
    };
    document.addEventListener("keydown", onKey);

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    setScale(1); // reset zoom przy każdym otwarciu
  }, [open]);

  if (!open) return null;
  if (typeof document === "undefined") return null;

  const root = ensureModalRoot();

  const chip =
    "inline-flex items-center gap-2 px-3 py-1 rounded-full " +
    "border border-white/10 bg-white/5 text-white/80 text-xs";

  const btn =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold " +
    "border border-white/10 bg-white/5 text-white/85 hover:bg-white/10 hover:border-white/15 " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40 transition";

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] " +
    "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/45 transition";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999999] flex items-center justify-center"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(10px)" }}
    >
      {/* overlay */}
      <div onClick={onClose} className="absolute inset-0 cursor-pointer" />

      {/* okno */}
      <div className="relative w-[min(1100px,92vw)] max-h-[88vh] rounded-[26px] border border-white/10 bg-emerald-950/70 backdrop-blur-xl shadow-[0_40px_120px_rgba(0,0,0,0.65)] overflow-hidden">
        {/* topbar */}
        <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-white/10">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
                {kind === "pdf" ? (
                  <FileText className="w-4 h-4 text-[#d7b45a]" />
                ) : (
                  <ImageIcon className="w-4 h-4 text-[#d7b45a]" />
                )}
              </div>

              <div className="min-w-0">
                <div className="text-white font-semibold truncate">
                  {title ?? filename ?? "Podgląd"}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span className={chip}>
                    {kind === "pdf" ? "PDF" : kind === "image" ? "Obraz" : "Plik"}
                  </span>
                  {filename ? <span className="text-xs text-white/55 truncate">{filename}</span> : null}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* zoom (dla obrazka) */}
            {kind === "image" ? (
              <>
                <button type="button" className={btn} onClick={() => setScale((s) => Math.max(0.6, +(s - 0.1).toFixed(2)))}>
                  <ZoomOut className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/70 w-14 text-center">{Math.round(scale * 100)}%</span>
                <button type="button" className={btn} onClick={() => setScale((s) => Math.min(2.25, +(s + 0.1).toFixed(2)))}>
                  <ZoomIn className="w-4 h-4" />
                </button>
              </>
            ) : null}

            <a className={btn} href={fullUrl} target="_blank" rel="noreferrer" title="Otwórz w nowej karcie">
              <ExternalLink className="w-4 h-4" />
            </a>

            <a className={btnGold} href={fullUrl} download title="Pobierz">
              <Download className="w-4 h-4" />
              Pobierz
            </a>

            <button type="button" onClick={onClose} className={btn} title="Zamknij">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* content */}
        <div className="bg-black/15">
          {kind === "image" ? (
            <div className="max-h-[calc(88vh-72px)] overflow-auto p-6">
              <div className="w-full flex justify-center">
                <img
                  src={fullUrl}
                  alt={filename ?? "podgląd"}
                  style={{ transform: `scale(${scale})`, transformOrigin: "top center" }}
                  className="rounded-2xl border border-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.55)] select-none"
                  draggable={false}
                />
              </div>
              <div className="mt-4 text-xs text-white/50 text-center">
                Skróty: Ctrl/⌘ + / - / 0
              </div>
            </div>
          ) : kind === "pdf" ? (
            <div className="max-h-[calc(88vh-72px)] overflow-hidden">
              {/* Najprościej i stabilnie: osadzamy PDF w iframe */}
              <iframe
                title={filename ?? "PDF"}
                src={fullUrl}
                className="w-full h-[calc(88vh-72px)]"
              />
            </div>
          ) : (
            <div className="p-8 text-center text-white/70">
              Nie rozpoznano typu pliku. Użyj „Otwórz w nowej karcie”.
            </div>
          )}
        </div>
      </div>
    </div>,
    root
  );
}
