import { useEffect } from "react";
import { AlertTriangle, ShieldAlert, Info } from "lucide-react";
import { useUiStore } from "../store/ui";

function iconFor(tone: string) {
  switch (tone) {
    case "danger":
      return <ShieldAlert className="w-5 h-5 text-red-200" />;
    case "warning":
      return <AlertTriangle className="w-5 h-5 text-amber-200" />;
    default:
      return <Info className="w-5 h-5 text-white/75" />;
  }
}

export default function ConfirmModal() {
  const confirm = useUiStore((s) => s.confirm);
  const resolve = useUiStore((s) => s.resolveConfirm);

  // Scroll-lock: w modalach nie może "uciec" tło (UX / stabilność)
  useEffect(() => {
    if (!confirm) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirm]);

  useEffect(() => {
    if (!confirm) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") resolve(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [confirm, resolve]);

  if (!confirm) return null;

  const btnGold =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
    "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] " +
    "shadow-[0_10px_30px_-18px_rgba(215,180,90,0.9)] " +
    "hover:brightness-105 active:translate-y-[1px] focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/45 transition";

  const btnDanger =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold " +
    "bg-red-500/15 text-red-100 border border-red-400/25 " +
    "hover:bg-red-500/20 hover:border-red-400/35 focus:outline-none focus:ring-2 focus:ring-red-400/30 transition";

  const btnSecondary =
    "inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium " +
    "bg-white/5 text-white border border-white/10 " +
    "hover:bg-white/10 hover:border-white/15 focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/40 transition";

  const confirmBtn = confirm.tone === "danger" ? btnDanger : btnGold;

  return (
    <div className="fixed inset-0 z-[9998] grid place-items-center">
      {/* overlay */}
      <button
        type="button"
        className="absolute inset-0 bg-black/55"
        onClick={() => resolve(false)}
        aria-label="Zamknij"
      />

      <div
        className={
          "relative w-[520px] max-w-[calc(100vw-2rem)] rounded-2xl border border-white/10 " +
          "bg-[#0b1b14]/92 backdrop-blur-md shadow-[0_30px_120px_rgba(0,0,0,0.65)] p-6"
        }
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 w-10 h-10 rounded-2xl border border-white/10 bg-white/5 grid place-items-center">
            {iconFor(confirm.tone)}
          </div>

          <div className="min-w-0 flex-1">
            <div className="text-white text-lg font-bold">{confirm.title}</div>
            {confirm.message ? <div className="text-sm text-white/70 mt-2">{confirm.message}</div> : null}
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={() => resolve(false)}>
            {confirm.cancelText ?? "Anuluj"}
          </button>
          <button type="button" className={confirmBtn} onClick={() => resolve(true)}>
            {confirm.confirmText ?? "Potwierdź"}
          </button>
        </div>
      </div>
    </div>
  );
}
