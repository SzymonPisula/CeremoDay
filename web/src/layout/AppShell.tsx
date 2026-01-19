import { useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import Sidebar from "./Sidebar";
import { cn } from "../theme/helpers";
import { useAuthStore } from "../store/auth";

type Props = {
  eventId: string | null;
  weddingDayEnabled?: boolean; // ✅ NOWE

};


const TOPBAR_H = 72;

export default function AppShell({ eventId, weddingDayEnabled }: Props) {
  const [sidebarOpen, setSidebarOpen] = useState(false); // mobile
  // desktop: zwijamy menu "do góry w pasek" (sidebar znika, zostaje tylko segment w topbarze)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const logout = useAuthStore((s) => s.logout);

  // szerokość lewego segmentu topbara dopasowana do stanu sidebara
  const leftW = sidebarCollapsed ? "w-[92px]" : "w-[300px]";
  const location = useLocation();


  // prosta etykieta modułu z URL (możesz to potem spiąć z configiem routów)
  const moduleTitle = useMemo(() => {
    const p = location.pathname;
    if (p.includes("/guests")) return "Goście";
    if (p.includes("/documents")) return "Dokumenty";
    if (p.includes("/vendors")) return "Usługodawcy";
    if (p.includes("/inspirations")) return "Inspiracje";
    if (p.includes("/tasks")) return "Zadania";
    if (p.includes("/finance")) return "Finanse";
    if (p.includes("/reports")) return "Raporty";
    if (p.includes("/interview")) return "Wywiad";
    if (p.includes("/event/")) return "Panel wydarzenia";
    return "Panel";
  }, [location.pathname]);

  return (
    <div className="min-h-screen">
      {/* TOPBAR (pełna szerokość, „przedłużony w lewo”) */}
      <header
        className={cn(
          "fixed top-0 left-0 right-0 z-[60]",
          "bg-[rgba(6,26,18,0.55)] backdrop-blur-xl",
          "border-b border-[rgba(255,255,255,0.08)]"
        )}
        style={{ height: TOPBAR_H }}
      >
        <div className="h-full flex items-center">
          {/* LEWY SEGMENT = szerokość sidebara */}
          <div className={cn("h-full px-3", leftW)}>
            {/*
              Ten "klocek" ma być kontynuacją sidebara.
              Przy rozłożonym menu robimy płaskie dno, a sam sidebar dostaje zakładkę pod topbar.
            */}
            <div
  className={cn(
    "h-full border border-[rgba(255,255,255,0.08)] bg-[rgba(10,40,28,0.22)]",
    "shadow-[0_18px_50px_rgba(0,0,0,0.28)] flex items-center justify-between px-4",
    "rounded-[26px] overflow-hidden"
  )}
>

              {/* MOBILE: hamburger */}
              <button
                type="button"
                className={cn(
                  "lg:hidden inline-flex items-center justify-center",
                  "h-10 w-10 rounded-[18px] border border-[rgba(255,255,255,0.10)]",
                  "bg-[rgba(255,255,255,0.06)] hover:bg-[rgba(255,255,255,0.10)] transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.35)]"
                )}
                onClick={() => {
                  if (sidebarCollapsed) setSidebarCollapsed(false);
                  setSidebarOpen((v) => !v);
                }}
                aria-label="Otwórz menu"
              >
                ☰
              </button>

              {/* ✅ DESKTOP: cały kafelek jako przełącznik */}
              <button
                type="button"
                className={cn(
                  "ml-2 flex-1 flex items-center justify-between gap-3",
                  "h-12 rounded-[18px] px-3",
                  "bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] transition",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.35)]"
                )}
                onClick={() => setSidebarCollapsed((v) => !v)}
                aria-label="Zwiń/rozwiń menu"
                title="Zwiń/rozwiń menu"
              >
                <div className={cn("flex items-center gap-3", sidebarCollapsed && "justify-center w-full")}>
                  <img
  src="/logo.png"
  alt="CeremoDay"
  className="h-10 w-10 rounded-[18px] object-contain"
  draggable={false}
/>

                  {!sidebarCollapsed && (
                    <div className="leading-tight text-left">
                      <div className="text-sm font-semibold tracking-wide text-white/90">CeremoDay</div>
                      <div className="text-xs text-[rgba(245,246,248,0.65)]">Wedding planner</div>
                    </div>
                  )}
                </div>

                <span
                  className={cn(
                    "hidden lg:inline-flex items-center justify-center",
                    "h-8 w-8 rounded-[14px] border border-[rgba(255,255,255,0.10)]",
                    "bg-[rgba(255,255,255,0.06)]",
                    "text-white/80"
                  )}
                  aria-hidden="true"
                >
                  {sidebarCollapsed ? "▾" : "▴"}
                </span>
              </button>
            </div>
          </div>

          {/* PRAWA CZĘŚĆ TOPBARA */}
          <div className="flex-1 pr-6">
            <div className="h-full flex items-center justify-between">
              <div className="min-w-0 pl-2">
                <div className="text-[13px] text-white/65">{eventId ? `Wydarzenie: ${eventId}` : "—"}</div>
                <div className="text-base font-semibold text-white/90 truncate">{moduleTitle}</div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  className={cn(
                    "rounded-[18px] px-4 py-2 text-sm",
                    "border border-[rgba(255,255,255,0.10)] bg-[rgba(10,40,28,0.22)]",
                    "hover:bg-[rgba(10,40,28,0.35)] transition-colors text-white/85",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.35)]"
                  )}
                  onClick={() => (window.location.href = "/dashboard")}
                >
                  Panel
                </button>

                <button
                  type="button"
                  className={cn(
                    "rounded-[18px] px-4 py-2 text-sm",
                    "border border-[rgba(255,255,255,0.10)] bg-[rgba(10,40,28,0.22)]",
                    "hover:bg-[rgba(10,40,28,0.35)] transition-colors text-white/85",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.35)]"
                  )}
                  onClick={() => {
                    logout();
                    window.location.href = "/login";
                  }}
                >
                  Wyloguj
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* SIDEBAR */}
      <Sidebar
  eventId={eventId}
  open={sidebarOpen}
  onOpenChange={setSidebarOpen}
  topbarHeightPx={TOPBAR_H}
  topbarGapPx={16}
  weddingDayEnabled={!!weddingDayEnabled}
/>



      {/* CONTENT */}
      <main className="pt-[72px]">
  <div className="px-4 sm:px-6 py-6">
    <Outlet />
  </div>
</main>

    </div>
  );
}
