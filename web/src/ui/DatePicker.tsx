// CeremoDay/web/src/ui/DatePicker.tsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";

type Props = {
  label?: string;
  value: string; // "YYYY-MM-DD" albo ""
  onChange: (next: string) => void;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  allowClear?: boolean;

  // ✅ nowe możliwości (Tasks/Wywiad)
  align?: "left" | "right";
  size?: "sm" | "md";
  maxDropdownWidth?: number;

  // ✅ NOWE: zakres dat (wizualnie + blokada)
  minDate?: string; // YYYY-MM-DD
  maxDate?: string; // YYYY-MM-DD
  rangeHint?: string; // opcjonalny tekst pod kalendarzem
};

type Rect = { left: number; top: number; width: number; height: number; bottom: number };

function cx(...v: Array<string | undefined | false>) {
  return v.filter(Boolean).join(" ");
}

function formatDisplay(value: string) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString("pl-PL", { year: "numeric", month: "short", day: "2-digit" });
}

function formatDMY(value: string) {
  if (!value) return "";
  const [y, m, d] = value.split("-");
  if (!y || !m || !d) return value;
  return `${d}-${m}-${y}`;
}

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonth(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

function addMonths(d: Date, delta: number) {
  return new Date(d.getFullYear(), d.getMonth() + delta, 1);
}

function clamp(n: number, min: number, max: number) {
  return Math.min(Math.max(n, min), max);
}

// lex compare działa dla YYYY-MM-DD
function isBefore(a: string, b: string) {
  return a < b;
}
function isAfter(a: string, b: string) {
  return a > b;
}

export default function DatePicker({
  label,
  value,
  onChange,
  disabled,
  placeholder = "Wybierz datę",
  className,
  buttonClassName,
  allowClear = true,
  align = "left",
  size = "md",
  maxDropdownWidth = 360,
  minDate,
  maxDate,
  rangeHint,
}: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [rect, setRect] = useState<Rect | null>(null);

  const selectedDate = useMemo(() => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  }, [value]);

  const [month, setMonth] = useState<Date>(() => startOfMonth(selectedDate ?? new Date()));

  useEffect(() => {
    if (!open) return;
    setMonth(startOfMonth(selectedDate ?? new Date()));
  }, [open, selectedDate]);

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
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      const target = e.target as Node;
      if (rootRef.current?.contains(target)) return;
      if (btnRef.current?.contains(target)) return;
      if (dropdownRef.current?.contains(target)) return;
      setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const weekDayLabels = ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"];

  const calendar = useMemo(() => {
    const year = month.getFullYear();
    const m = month.getMonth();
    const first = new Date(year, m, 1);
    const firstWeekday = first.getDay() === 0 ? 7 : first.getDay(); // pon=1
    const daysInMonth = new Date(year, m + 1, 0).getDate();

    const cells: Array<Date | null> = [];
    for (let i = 1; i < firstWeekday; i++) cells.push(null);
    for (let day = 1; day <= daysInMonth; day++) cells.push(new Date(year, m, day));
    while (cells.length % 7 !== 0) cells.push(null);

    const weeks: Array<Array<Date | null>> = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    return { year, month: m, weeks };
  }, [month]);

  // ✅ spójny wygląd inputa w zależności od size
  const btnBase =
    "w-full rounded-xl bg-white/5 border border-white/10 text-left " +
    "outline-none focus:border-[#c8a04b]/50 focus:ring-2 focus:ring-[#c8a04b]/15 transition " +
    (size === "sm" ? "px-3 py-1.5 text-sm" : "px-3 py-2");

  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const viewportPadding = 12;
  const MIN_DROPDOWN_W = 320;

  const dropdownWidth = rect
    ? clamp(Math.max(rect.width, MIN_DROPDOWN_W), MIN_DROPDOWN_W, maxDropdownWidth)
    : clamp(MIN_DROPDOWN_W, MIN_DROPDOWN_W, maxDropdownWidth);

  const dropdownLeft = rect
    ? align === "right"
      ? clamp(rect.left + rect.width - dropdownWidth, viewportPadding, viewportW - dropdownWidth - viewportPadding)
      : clamp(rect.left, viewportPadding, viewportW - dropdownWidth - viewportPadding)
    : viewportPadding;

  const dropdownTop = rect ? rect.bottom + 8 : 0;

  const isDateAllowed = (dayISO: string) => {
    if (minDate && isBefore(dayISO, minDate)) return false;
    if (maxDate && isAfter(dayISO, maxDate)) return false;
    return true;
  };

  const rangeMode: "none" | "forward" | "backward" | "between" =
    minDate && maxDate ? "between" : minDate ? "forward" : maxDate ? "backward" : "none";

  const dropdown =
    open && rect
      ? createPortal(
          <div
            ref={dropdownRef}
            style={{
              position: "fixed",
              left: dropdownLeft,
              top: dropdownTop,
              width: dropdownWidth,
              zIndex: 10000060,
            }}
            className={cx(
              "rounded-2xl overflow-hidden",
              "bg-[#0b1713]/95 backdrop-blur-xl",
              "border border-white/10",
              "shadow-[0_18px_55px_rgba(0,0,0,0.55)]"
            )}
          >
            <div className={cx(size === "sm" ? "p-3" : "p-4")}>
              {/* header */}
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => setMonth((d) => addMonths(d, -1))}
                  className={cx(
                    "rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition grid place-items-center",
                    size === "sm" ? "h-8 w-8" : "h-9 w-9"
                  )}
                >
                  <ChevronLeft className={cx("w-4 h-4", "text-white/80")} />
                </button>

                <div className={cx("font-semibold text-white", "text-sm")}>
                  {new Date(calendar.year, calendar.month, 1).toLocaleDateString("pl-PL", {
                    month: "long",
                    year: "numeric",
                  })}
                </div>

                <button
                  type="button"
                  onClick={() => setMonth((d) => addMonths(d, 1))}
                  className={cx(
                    "rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition grid place-items-center",
                    size === "sm" ? "h-8 w-8" : "h-9 w-9"
                  )}
                >
                  <ChevronRight className={cx("w-4 h-4", "text-white/80")} />
                </button>
              </div>

              {/* weekdays */}
              <div className={cx("grid grid-cols-7 gap-1 text-white/55", size === "sm" ? "mt-2 text-[10px]" : "mt-3 text-[11px]")}>
                {weekDayLabels.map((w) => (
                  <div key={w} className={cx("text-center", size === "sm" ? "py-0.5" : "py-1")}>
                    {w}
                  </div>
                ))}
              </div>

              {/* days */}
              <div className={cx("grid grid-cols-7 gap-1", "mt-1")}>
                {calendar.weeks.flat().map((d, idx) => {
                  const key = d ? ymd(d) : `empty-${idx}`;
                  const dayISO = d ? ymd(d) : "";
                  const allowed = d ? isDateAllowed(dayISO) : false;
                  const isSelected = d && value && dayISO === value;

                  // subtelne “podświetlenie zakresu” dla dozwolonych dat
                  const allowedRangeBg =
                    rangeMode === "none"
                      ? ""
                      : allowed
                      ? "bg-white/[0.06] border-white/10"
                      : "bg-black/10 border-white/5";

                  return (
                    <button
                      key={key}
                      type="button"
                      disabled={!d || !allowed}
                      onClick={() => {
                        if (!d) return;
                        if (!allowed) return;
                        onChange(dayISO);
                        setOpen(false);
                      }}
                      className={cx(
                        "rounded-xl border transition",
                        size === "sm" ? "h-8 text-[13px]" : "h-9 text-sm",
                        d ? allowedRangeBg : "opacity-0 cursor-default border-transparent",
                        !d
                          ? ""
                          : allowed
                          ? "text-white/85 hover:bg-white/10 hover:border-white/15"
                          : "text-white/25 opacity-50 cursor-not-allowed hover:bg-transparent",
                        isSelected ? "bg-[#c8a04b]/18 border-[#c8a04b]/45 text-white shadow-[0_0_0_3px_rgba(200,160,75,0.12)]" : ""
                      )}
                      title={
                        d
                          ? !allowed
                            ? minDate && isBefore(dayISO, minDate)
                              ? `Dostępne od: ${formatDMY(minDate)}`
                              : maxDate && isAfter(dayISO, maxDate)
                              ? `Dostępne do: ${formatDMY(maxDate)}`
                              : ""
                            : ""
                          : ""
                      }
                    >
                      {d ? d.getDate() : ""}
                    </button>
                  );
                })}
              </div>

              {/* hint zakresu */}
              {(minDate || maxDate || rangeHint) ? (
                <div className={cx("mt-2 text-[11px] text-white/45")}>
                  {rangeHint
                    ? rangeHint
                    : minDate && !maxDate
                    ? `Dostępne od: ${formatDMY(minDate)}`
                    : maxDate && !minDate
                    ? `Dostępne do: ${formatDMY(maxDate)}`
                    : minDate && maxDate
                    ? `Dostępne w zakresie: ${formatDMY(minDate)} – ${formatDMY(maxDate)}`
                    : null}
                </div>
              ) : null}

              {/* footer */}
              <div className={cx("flex items-center justify-between gap-2", size === "sm" ? "mt-2" : "mt-3")}>
                <button
                  type="button"
                  onClick={() => {
                    const today = ymd(new Date());
                    if (!isDateAllowed(today)) return;
                    onChange(today);
                    setOpen(false);
                  }}
                  className="text-xs text-white/70 hover:text-white transition disabled:opacity-50"
                  disabled={!isDateAllowed(ymd(new Date()))}
                  title={!isDateAllowed(ymd(new Date())) ? "Dzisiejsza data jest poza zakresem" : "Ustaw dzisiejszą datę"}
                >
                  Dzisiaj
                </button>

                {allowClear && value ? (
                  <button
                    type="button"
                    onClick={() => {
                      onChange("");
                      setOpen(false);
                    }}
                    className="inline-flex items-center gap-2 text-xs text-white/70 hover:text-white transition"
                  >
                    <X className="w-3.5 h-3.5" />
                    Wyczyść
                  </button>
                ) : null}
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={cx("w-full", className)}>
      {label ? <div className="text-xs text-white/70 mb-1">{label}</div> : null}

      <button
        ref={btnRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setOpen((v) => {
            const next = !v;
            if (next) requestAnimationFrame(measure);
            return next;
          });
        }}
        className={cx(
          btnBase,
          "inline-flex items-center justify-between gap-3",
          disabled ? "opacity-60 cursor-not-allowed" : "",
          buttonClassName
        )}
      >
        <span className={cx("truncate", value ? "text-white/90" : "text-white/45")}>
          {value ? formatDisplay(value) : placeholder}
        </span>
        <CalendarIcon className={cx("shrink-0", size === "sm" ? "w-4 h-4 text-white/35" : "w-4 h-4 text-white/35")} />
      </button>

      {dropdown}
    </div>
  );
}
