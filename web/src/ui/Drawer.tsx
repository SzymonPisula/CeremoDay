import { useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../theme/helpers";

type Props = {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  widthClassName?: string; // np. "sm:w-[560px]"
};

export default function Drawer({ open, onClose, title, children, widthClassName }: Props) {
  const portalTarget = useMemo(() => (typeof document !== "undefined" ? document.body : null), []);

  // blokada scrolla tła + ESC
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open || !portalTarget) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200]">
      {/* overlay */}
      <button
        type="button"
        aria-label="Zamknij"
        onClick={onClose}
        className="absolute inset-0 bg-black/55 backdrop-blur-sm"
      />

      {/* panel */}
      <div
        className={cn(
          "absolute right-0 top-0 h-full w-full",
          widthClassName ?? "sm:w-[560px]"
        )}
      >
        <div
          className={cn(
            "h-full rounded-l-[28px] border-l border-white/10 bg-[#071812]/92 backdrop-blur-xl",
            "shadow-[-20px_0_90px_rgba(0,0,0,0.55)]",
            "transform transition-transform duration-200 ease-out translate-x-0"
          )}
        >
          {/* top bar */}
          <div className="relative px-6 pt-6 pb-4 border-b border-white/10">
            {/* glow */}
            <div className="pointer-events-none absolute -top-20 -right-20 h-56 w-56 rounded-full bg-[#c8a04b]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-56 w-56 rounded-full bg-emerald-400/10 blur-3xl" />

            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                {title ? (
                  <div className="text-lg font-semibold text-white/92">{title}</div>
                ) : (
                  <div className="text-lg font-semibold text-white/92">Panel</div>
                )}
                <div className="mt-1 text-xs text-white/45">
                  Zmiany zapisuj przyciskiem na dole.
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className={cn(
                  "inline-flex items-center justify-center rounded-2xl px-3 py-2",
                  "border border-white/10 bg-white/5 text-white/70",
                  "hover:bg-white/8 hover:text-white/90 transition"
                )}
                aria-label="Zamknij drawer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* content */}
          <div className="px-6 py-6 overflow-auto h-[calc(100%-80px)]">
            {children}
          </div>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
