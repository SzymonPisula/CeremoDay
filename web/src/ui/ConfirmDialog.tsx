import React, { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, X } from "lucide-react";

type Props = {
  open: boolean;
  title: string;

  // ✅ wspieramy oba warianty nazwy (żeby nie waliło TS-em w różnych miejscach)
  message?: string;
  description?: string;

  confirmText?: string;
  cancelText?: string;
  danger?: boolean;

  onClose: () => void;
  onConfirm: () => Promise<void> | void;
};

function cx(...v: Array<string | undefined | false>) {
  return v.filter(Boolean).join(" ");
}

export default function ConfirmDialog({
  open,
  title,
  message,
  description,
  confirmText = "Potwierdź",
  cancelText = "Anuluj",
  danger = false,
  onClose,
  onConfirm,
}: Props) {
  const boxRef = useRef<HTMLDivElement | null>(null);

  // ✅ Scroll-lock tła kiedy modal otwarty
  useEffect(() => {
    if (!open) return;

    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // ✅ ESC zamyka
  useEffect(() => {
    if (!open) return;

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // ✅ focus po otwarciu
  useEffect(() => {
    if (!open) return;
    window.setTimeout(() => boxRef.current?.focus(), 0);
  }, [open]);

  if (!open) return null;

  const text = (message ?? description ?? "").trim();

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      {/* overlay */}
      <div
        className="absolute inset-0 bg-black/60"
        onMouseDown={(e) => {
          // klik w tło zamyka (ale nie klik w sam modal)
          if (e.target === e.currentTarget) onClose();
        }}
      />

      {/* wrapper */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          ref={boxRef}
          tabIndex={-1}
          className={cx(
            "w-full max-w-[520px] rounded-2xl outline-none",
            "border border-white/10 bg-[#0b1b14]/90 text-white backdrop-blur-md",
            "shadow-[0_24px_80px_rgba(0,0,0,0.55)]"
          )}
          role="dialog"
          aria-modal="true"
        >
          {/* header */}
          <div className="flex items-start justify-between gap-3 p-5 border-b border-white/10">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div
                  className={cx(
                    "w-9 h-9 rounded-xl border flex items-center justify-center",
                    danger ? "border-red-400/25 bg-red-500/10" : "border-white/10 bg-white/5"
                  )}
                >
                  <AlertTriangle className={cx("w-5 h-5", danger ? "text-red-200" : "text-[#d7b45a]")} />
                </div>

                <div className="text-[16px] md:text-[17px] font-semibold text-white/90 truncate">
                  {title}
                </div>
              </div>

              {text ? (
                <div className="mt-3 text-sm text-white/70 leading-relaxed whitespace-pre-wrap">
                  {text}
                </div>
              ) : null}
            </div>

            <button
              type="button"
              className={cx(
                "shrink-0 w-9 h-9 rounded-xl border border-white/10 bg-white/5",
                "hover:bg-white/10 hover:border-white/15 transition",
                "flex items-center justify-center"
              )}
              onClick={onClose}
              aria-label="Zamknij"
              title="Zamknij"
            >
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>

          {/* actions */}
          <div className="p-5 flex items-center justify-end gap-2">
            <button
              type="button"
              className={cx(
                "h-10 px-4 rounded-xl text-sm font-medium",
                "border border-white/10 bg-white/5 text-white/85",
                "hover:bg-white/10 hover:border-white/15 transition"
              )}
              onClick={onClose}
            >
              {cancelText}
            </button>

            <button
              type="button"
              className={cx(
                "h-10 px-4 rounded-xl text-sm font-semibold transition",
                danger
                  ? "border border-red-400/20 bg-red-500/15 text-red-50 hover:bg-red-500/20"
                  : "bg-gradient-to-r from-[#d7b45a] to-[#b98b2f] text-[#0b1b14] hover:brightness-105"
              )}
              onClick={() => void onConfirm()}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
