// /d:/CeremoDay/CeremoDay/web/src/ui/Select.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, Check } from "lucide-react";

export type SelectOption<T extends string> = {
  value: T;
  label: string;
  disabled?: boolean;
};

type Props<T extends string> = {
  label?: string;
  value: T | "";
  onChange: (value: T) => void;
  options: ReadonlyArray<SelectOption<T>>;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
};

function cx(...v: Array<string | undefined | false>) {
  return v.filter(Boolean).join(" ");
}

type Rect = { left: number; top: number; width: number; height: number; bottom: number };

export default function Select<T extends string>({
  label,
  value,
  onChange,
  options,
  placeholder = "Wybierz…",
  disabled,
  className,
  buttonClassName,
}: Props<T>) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);

  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState<number>(-1);
  const [rect, setRect] = useState<Rect | null>(null);

  const selected = useMemo(() => options.find((o) => o.value === value), [options, value]);
  const enabledOptions = useMemo(() => options.filter((o) => !o.disabled), [options]);

  // --- pozycjonowanie dropdownu (portal) ---
  const measure = () => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height, bottom: r.bottom });
  };

  useEffect(() => {
    if (!open) return;
    measure();

    const onScroll = () => measure();
    const onResize = () => measure();

    // capture=true → złapie scroll także w wewnętrznych kontenerach
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  // zamykanie po kliknięciu poza (dla portalu też)
  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const root = rootRef.current;
      const btn = btnRef.current;
      const target = e.target as Node;

      // klik w komponent / przycisk → nie zamykamy
      if (root && root.contains(target)) return;
      if (btn && btn.contains(target)) return;

      // klik poza → zamykamy
      setOpen(false);
    }

    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const idx = enabledOptions.findIndex((o) => o.value === value);
    setActiveIndex(idx >= 0 ? idx : 0);
  }, [open, enabledOptions, value]);

  function pick(opt: SelectOption<T>) {
    if (opt.disabled) return;
    onChange(opt.value);
    setOpen(false);
    requestAnimationFrame(() => btnRef.current?.focus());
  }

  function toggle() {
    if (disabled) return;
    setOpen((s) => {
      const next = !s;
      if (next) requestAnimationFrame(measure);
      return next;
    });
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLButtonElement>) {
    if (disabled) return;

    if (!open) {
      if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
        e.preventDefault();
        setOpen(true);
        requestAnimationFrame(measure);
      }
      return;
    }

    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, enabledOptions.length - 1));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      const opt = enabledOptions[activeIndex];
      if (opt) pick(opt);
    }
  }

  const buttonText = selected?.label ?? placeholder;

  // dropdown style: fixed + portal, zawsze nad wszystkim
  const dropdown = open && rect
    ? createPortal(
        <div
          role="listbox"
          style={{
            position: "fixed",
            left: rect.left,
            top: rect.bottom + 8, // mt-2
            width: rect.width,
            zIndex: 99999, // ✅ absolutnie nad UI
          }}
          className={cx(
            "rounded-xl overflow-hidden",
            "bg-[#0b1713]/95 backdrop-blur-xl",
            "border border-white/10",
            "absolute left-0 right-0 mt-2 z-[200]",
            "shadow-[0_18px_55px_rgba(0,0,0,0.55)]"
          )}
        >
          {/* ✅ bez scrolla: pokazujemy całą listę */}
          <div>
            {options.map((opt) => {
              const isSelected = opt.value === value;
              const isDisabled = !!opt.disabled;

              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  disabled={isDisabled}
                  onClick={() => pick(opt)}
                  onMouseEnter={() => {
                    const idx = enabledOptions.findIndex((o) => o.value === opt.value);
                    if (idx >= 0) setActiveIndex(idx);
                  }}
                  className={cx(
                    "w-full px-4 py-3 flex items-center justify-between gap-3",
                    "text-left text-sm",
                    "border-b border-white/5 last:border-b-0",
                    "transition",
                    isDisabled ? "opacity-40 cursor-not-allowed" : "hover:bg-white/[0.06]",
                    isSelected ? "bg-white/[0.06] text-white" : "text-white/85"
                  )}
                >
                  <span>{opt.label}</span>
                  {isSelected ? (
                    <span className="inline-flex items-center gap-2 text-[#c8a04b]">
                      <Check className="w-4 h-4" />
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="h-[2px] bg-gradient-to-r from-transparent via-[#c8a04b]/70 to-transparent" />
        </div>,
        document.body
      )
    : null;

  return (
    <div ref={rootRef} className={cx("w-full", className)}>
      {label ? <div className="mb-2 text-[11px] tracking-wider uppercase text-white/60">{label}</div> : null}

      <div className="relative">
        <button
          ref={btnRef}
          type="button"
          disabled={disabled}
          onClick={toggle}
          onKeyDown={onKeyDown}
          aria-haspopup="listbox"
          aria-expanded={open}
          className={cx(
            "w-full h-11 px-4 flex items-center justify-between gap-3",
            "rounded-xl",
            "bg-white/[0.06] backdrop-blur border border-white/10",
            "text-left text-white/90",
            "shadow-[0_12px_35px_rgba(0,0,0,0.35)]",
            "transition",
            "hover:bg-white/[0.08] hover:border-white/14",
            "focus:outline-none focus:ring-2 focus:ring-[#c8a04b]/50 focus:border-[#c8a04b]/40",
            disabled && "opacity-60 cursor-not-allowed",
            buttonClassName
          )}
        >
          <span className={cx(!selected && "text-white/45")}>{buttonText}</span>
          <ChevronDown className={cx("w-5 h-5 text-white/60 transition-transform", open && "rotate-180")} />
        </button>

        {/* dropdown w portalu */}
        {dropdown}
      </div>
    </div>
  );
}
