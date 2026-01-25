import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  value: string; // "HH:mm"
  onChange: (next: string) => void;
  className?: string;
  heightPx?: number; // wysokość okna scrolla (domyślnie niższa)
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function parseValue(v: string) {
  const m = /^(\d{2}):(\d{2})$/.exec(v.trim());
  const hh = m ? clamp(Number(m[1]), 0, 23) : 12;
  const mm = m ? clamp(Number(m[2]), 0, 59) : 0;
  return { hh, mm };
}

export default function TimePickerWheel({
  value,
  onChange,
  className,
  heightPx = 140, // ✅ trochę niżej niż 150, bardziej “kompakt”
}: Props) {
  const { hh, mm } = useMemo(() => parseValue(value), [value]);

  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 60 }, (_, i) => i), []); // ✅ 00-59

  const ITEM_H = 32; // ✅ minimalnie niższy element = lepszy “fit” w UI
  const SPACERS = 2;

  const hourRef = useRef<HTMLDivElement | null>(null);
  const minRef = useRef<HTMLDivElement | null>(null);

  function pick(nextH: number, nextM: number) {
    onChange(`${pad2(nextH)}:${pad2(nextM)}`);
  }

  function scrollToIndex(ref: React.RefObject<HTMLDivElement | null>, idx: number) {
    const el = ref.current;
    if (!el) return;
    el.scrollTo({ top: (idx + SPACERS) * ITEM_H, behavior: "auto" });
  }

  // init + when value changes
  useEffect(() => {
    scrollToIndex(hourRef, hh);
    scrollToIndex(minRef, mm);
  }, [hh, mm]);

  function nearestIndex(el: HTMLDivElement, maxIdx: number) {
    const raw = el.scrollTop / ITEM_H;
    const idx = Math.round(raw) - SPACERS;
    return clamp(idx, 0, maxIdx);
  }

  function snapTo(el: HTMLDivElement, idx: number) {
    el.scrollTo({ top: (idx + SPACERS) * ITEM_H, behavior: "smooth" });
  }

  // ✅ Scroll myszką = 1 krok
  function bindWheelStep(
    ref: React.RefObject<HTMLDivElement | null>,
    maxIdx: number,
    onIdx: (idx: number) => void
  ) {
    const el = ref.current;
    if (!el) return () => {};

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;

      const current = nearestIndex(el, maxIdx);
      const next = clamp(current + dir, 0, maxIdx);

      snapTo(el, next);
      onIdx(next);
    };

    el.addEventListener("wheel", onWheel, { passive: false });

    return () => el.removeEventListener("wheel", onWheel);
  }

  // ✅ Scroll ręczny/drag + “snap” po puszczeniu
  function bindSnapOnScroll(
    ref: React.RefObject<HTMLDivElement | null>,
    maxIdx: number,
    onIdx: (idx: number) => void
  ) {
    const el = ref.current;
    if (!el) return () => {};

    let t: number | null = null;

    const onScroll = () => {
      if (t) window.clearTimeout(t);
      t = window.setTimeout(() => {
        const idx = nearestIndex(el, maxIdx);
        snapTo(el, idx);
        onIdx(idx);
      }, 120);
    };

    el.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      el.removeEventListener("scroll", onScroll);
      if (t) window.clearTimeout(t);
    };
  }

  useEffect(() => {
    const unbindHWheel = bindWheelStep(hourRef, 23, (idx) => pick(idx, mm));
    const unbindMWheel = bindWheelStep(minRef, 59, (idx) => pick(hh, idx));

    const unbindHSnap = bindSnapOnScroll(hourRef, 23, (idx) => pick(idx, mm));
    const unbindMSnap = bindSnapOnScroll(minRef, 59, (idx) => pick(hh, idx));

    return () => {
      unbindHWheel();
      unbindMWheel();
      unbindHSnap();
      unbindMSnap();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hh, mm]);

  const wheelBase =
    "rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md " +
    "shadow-[0_18px_55px_rgba(0,0,0,0.35)] overflow-hidden";

  const colBase =
    "overflow-y-auto scroll-smooth select-none " +
    "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden " +
    "snap-y snap-mandatory";

  // ✅ KLUCZ: w-full + text-center = idealne centrowanie w pasku
  const itemBase =
    "snap-start w-full flex items-center justify-center text-center " +
    "font-semibold tabular-nums " +
    "text-white/55 hover:text-white transition";

  const Spacer = () => <div style={{ height: ITEM_H * SPACERS }} />;

  return (
    <div className={className}>
      <div className={wheelBase}>
        <div className="p-3">
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start">
            <div className="text-[11px] text-white/55 text-center">Godz</div>
            <div />
            <div className="text-[11px] text-white/55 text-center">Min</div>
          </div>

          <div
            className="relative mt-2 rounded-2xl border border-white/10 bg-white/[0.03] overflow-hidden"
            style={{ height: heightPx }}
          >
            {/* okno selekcji (idealnie w środku scroll-area) */}
            <div
              className="pointer-events-none absolute inset-x-2 rounded-xl"
              style={{
                top: heightPx / 2 - ITEM_H / 2,
                height: ITEM_H,
              }}
            />

            <div className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/25 to-transparent" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-black/25 to-transparent" />

            <div className="grid grid-cols-[1fr_auto_1fr] gap-2 h-full px-2">
              {/* GODZ */}
              <div ref={hourRef} className={colBase} style={{ height: heightPx }}>
                <Spacer />
                {hours.map((h, idx) => {
                  const selected = idx === hh;
                  return (
                    <button
                      key={h}
                      type="button"
                      className={itemBase + (selected ? " text-white" : "")}
                      style={{ height: ITEM_H }}
                      onClick={() => {
                        hourRef.current?.scrollTo({
                          top: (idx + SPACERS) * ITEM_H,
                          behavior: "smooth",
                        });
                        pick(h, mm);
                      }}
                    >
                      {pad2(h)}
                    </button>
                  );
                })}
                <Spacer />
              </div>

              {/* ":" */}
              <div className="flex items-center justify-center text-white/40 font-bold select-none">
                :
              </div>

              {/* MIN */}
              <div ref={minRef} className={colBase} style={{ height: heightPx }}>
                <Spacer />
                {minutes.map((m, idx) => {
                  const selected = idx === mm;
                  return (
                    <button
                      key={m}
                      type="button"
                      className={itemBase + (selected ? " text-white" : "")}
                      style={{ height: ITEM_H }}
                      onClick={() => {
                        minRef.current?.scrollTo({
                          top: (idx + SPACERS) * ITEM_H,
                          behavior: "smooth",
                        });
                        pick(hh, m);
                      }}
                    >
                      {pad2(m)}
                    </button>
                  );
                })}
                <Spacer />
              </div>
            </div>
          </div>

          {/* ✅ usunięte: dolny podpis z wybraną godziną */}
        </div>
      </div>
    </div>
  );
}
