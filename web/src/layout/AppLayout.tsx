import { Outlet, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";

import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { api } from "../lib/api";

function getEventIdFromPath(pathname: string): string | null {
  const match = pathname.match(/^\/event\/([^/]+)(\/.*)?$/);
  return match ? match[1] : null;
}

function getTitleFromPath(pathname: string): string {
  if (pathname.startsWith("/event/")) {
    if (pathname.includes("/guests")) return "Goście";
    if (pathname.includes("/documents")) return "Dokumenty";
    if (pathname.includes("/vendors")) return "Usługodawcy";
    if (pathname.includes("/inspirations")) return "Inspiracje";
    if (pathname.includes("/tasks")) return "Zadania";
    if (pathname.includes("/finance")) return "Finanse";
    if (pathname.includes("/reports")) return "Raporty";
    if (pathname.includes("/interview")) return "Wywiad";
    return "Panel wydarzenia";
  }
  if (pathname.startsWith("/dashboard")) return "Moje wydarzenia";
  return "CeremoDay";
}

export type AppLayoutOutletContext = {
  eventId: string | null;
  eventName: string | null;
};

export default function AppLayout() {
  const location = useLocation();

  const eventId = useMemo(() => getEventIdFromPath(location.pathname), [location.pathname]);
  const title = useMemo(() => getTitleFromPath(location.pathname), [location.pathname]);

  const [eventName, setEventName] = useState<string | null>(null);

  // ✅ overlay sidebar (desktop + mobile)
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // ===== stałe UI =====
  const topbarHeightPx = 64;
  const topbarGapPx = 16;
  const shellMaxWidthPx = 1280;
  const shellPaddingClass = "px-4 lg:px-6";

  // ✅ po zmianie routingu zamykamy panel
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // ✅ blokuj scroll body przy otwartym overlay (ważne na desktop)
  useEffect(() => {
    if (!sidebarOpen) return;

    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen]);

  // ===== pobieranie nazwy eventu (cache w sessionStorage) =====
  useEffect(() => {
    let alive = true;

    async function load() {
      if (!eventId) {
        setEventName(null);
        return;
      }

      const cacheKey = "cache:events";

      try {
        const cachedRaw = sessionStorage.getItem(cacheKey);
        if (cachedRaw) {
          const cached = JSON.parse(cachedRaw) as {
            ts: number;
            events: Array<{ id: string; name?: string }>;
          };

          if (Date.now() - cached.ts < 60_000) {
            const hit = cached.events.find((e) => e.id === eventId);
            if (hit?.name && alive) setEventName(hit.name);
          }
        }
      } catch {
        // ignore
      }

      try {
        const events = (await api.getEvents()) as Array<{ id: string; name?: string }>;
        if (!alive) return;

        const hit = events.find((e) => e.id === eventId);
        setEventName(hit?.name ?? null);

        try {
          sessionStorage.setItem(cacheKey, JSON.stringify({ ts: Date.now(), events }));
        } catch {
          // ignore
        }
      } catch {
        if (!alive) return;
        setEventName(null);
      }
    }

    void load();
    return () => {
      alive = false;
    };
  }, [eventId]);

  const outletContext: AppLayoutOutletContext = { eventId, eventName };

  return (
    <div className="min-h-screen">
      <div className="flex">
        {/* ✅ Sidebar overlay — props tylko te które masz w SidebarProps */}
        <Sidebar
          eventId={eventId}
          open={sidebarOpen}
          onOpenChange={setSidebarOpen}
          topbarHeightPx={topbarHeightPx}
          topbarGapPx={topbarGapPx}
        />

        {/* ✅ Prawa część: sticky TopBar + scroll w treści */}
        <div className="min-w-0 flex-1 flex flex-col" style={{ height: "100vh" }}>
          <div className="sticky top-0 z-40">
            <TopBar
              title={title}
              onMenu={() => setSidebarOpen((v) => !v)} // toggle
              eventId={eventId}
              eventName={eventName}
            />
          </div>

          {/* Scroll container */}
          <div className="flex-1 min-h-0 overflow-y-auto">
            <main className={`${shellPaddingClass} pb-10`} style={{ paddingTop: 24 }}>
              <div className="mx-auto w-full" style={{ maxWidth: shellMaxWidthPx }}>
                <Outlet context={outletContext} />
              </div>
            </main>
          </div>
        </div>
      </div>

      {/* (opcjonalnie) placeholder — możesz usunąć */}
      <div style={{ height: topbarGapPx + topbarHeightPx, display: "none" }} />
    </div>
  );
}
