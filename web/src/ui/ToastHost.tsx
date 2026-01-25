import { createPortal } from "react-dom";
import { X, AlertTriangle, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { useUiStore } from "../store/ui";

function iconFor(tone: string) {
  switch (tone) {
    case "success":
      return <CheckCircle2 className="w-4 h-4" />;
    case "warning":
      return <AlertTriangle className="w-4 h-4" />;
    case "danger":
      return <ShieldAlert className="w-4 h-4" />;
    default:
      return <Info className="w-4 h-4" />;
  }
}

function badgeClass(tone: string) {
  switch (tone) {
    case "success":
      return "border-emerald-400/25 bg-emerald-400/10 text-emerald-200";
    case "warning":
      return "border-amber-400/25 bg-amber-400/10 text-amber-200";
    case "danger":
      return "border-red-400/25 bg-red-400/10 text-red-200";
    default:
      return "border-white/15 bg-white/8 text-white/80";
  }
}

export default function ToastHost() {
  const toasts = useUiStore((s) => s.toasts);
  const dismiss = useUiStore((s) => s.dismissToast);

  // ✅ SSR safe
  if (typeof document === "undefined") return null;

  // ✅ Portal -> zawsze nad modalami (nie zależy od zagnieżdżenia komponentów)
  return createPortal(
    <div
      className={
        // ✅ z-index większy niż modal (modal ma u Ciebie ~ z-[9999999])
        // ✅ pointer-events: host nie blokuje klików poza toastami
        "fixed top-4 right-4 z-[10000050] w-[360px] max-w-[calc(100vw-2rem)] space-y-3 pointer-events-none"
      }
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={
            "pointer-events-auto " +
            "rounded-2xl border border-white/10 bg-[#0b1b14]/80 backdrop-blur-md " +
            "shadow-[0_24px_80px_rgba(0,0,0,0.55)] p-4"
          }
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 inline-flex items-center justify-center w-8 h-8 rounded-xl border ${badgeClass(
                t.tone
              )}`}
            >
              {iconFor(t.tone)}
            </div>

            <div className="min-w-0 flex-1">
              <div className="text-white font-semibold">{t.title}</div>
              {t.message ? <div className="text-sm text-white/70 mt-1">{t.message}</div> : null}
            </div>

            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="inline-flex items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition w-8 h-8"
              aria-label="Zamknij"
              title="Zamknij"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      ))}
    </div>,
    document.body
  );
}
