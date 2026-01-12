// web/src/layout/EventShell.tsx
import { useMemo, useState } from "react";
import { NavLink, Outlet, useParams, useNavigate } from "react-router-dom";
import {
  Users,
  FileText,
  Wallet,
  BarChart3,
  CalendarDays,
  MapPin,
  Bell,
  Sparkles,
  ClipboardList,
  Menu,
  LogOut,
} from "lucide-react";

import Button from "../ui/Button";
import { useAuthStore } from "../store/auth";

type Params = { id?: string };

type Item = {
  key: string;
  label: string;
  to: string;
  icon: JSX.Element;
  badge?: string;
};

export default function EventShell() {
  const { id } = useParams<Params>();
  const eventId = id ?? "";
  const nav = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const [collapsed, setCollapsed] = useState(false);

  const items: Item[] = useMemo(() => {
    const base = eventId ? `/event/${eventId}` : "/dashboard";

    return [
      { key: "overview", label: "Panel wydarzenia", to: `${base}`, icon: <BarChart3 className="w-5 h-5" /> },

      { key: "guests", label: "Goście", to: `${base}/guests`, icon: <Users className="w-5 h-5" /> },
      { key: "documents", label: "Dokumenty", to: `${base}/documents`, icon: <FileText className="w-5 h-5" /> },
      { key: "vendors", label: "Usługodawcy", to: `${base}/vendors`, icon: <MapPin className="w-5 h-5" /> },
      { key: "inspirations", label: "Inspiracje", to: `${base}/inspirations`, icon: <Sparkles className="w-5 h-5" /> },
      { key: "tasks", label: "Zadania", to: `${base}/tasks`, icon: <ClipboardList className="w-5 h-5" /> },

      { key: "schedule", label: "Harmonogram", to: `${base}/schedule`, icon: <CalendarDays className="w-5 h-5" />, badge: "Wkrótce" },
      { key: "notifications", label: "Powiadomienia", to: `${base}/notifications`, icon: <Bell className="w-5 h-5" />, badge: "Wkrótce" },
      { key: "finance", label: "Finanse", to: `${base}/finance`, icon: <Wallet className="w-5 h-5" />, badge: "Wkrótce" },
      { key: "reports", label: "Raporty", to: `${base}/reports`, icon: <BarChart3 className="w-5 h-5" />, badge: "Wkrótce" },
    ];
  }, [eventId]);

  return (
    <div className="min-h-screen">
      {/* Tło: ciemna zieleń + złoto + biel (bez “kółek”) */}
      <div className="fixed inset-0 -z-10 bg-[radial-gradient(1100px_700px_at_15%_20%,rgba(201,162,77,0.18),transparent_55%),radial-gradient(900px_620px_at_85%_18%,rgba(40,130,90,0.26),transparent_58%),radial-gradient(850px_620px_at_45%_85%,rgba(255,255,255,0.10),transparent_60%),linear-gradient(180deg,#061a13,#04110d)]" />

      <div className="flex">
        {/* Sidebar */}
        <aside
          className={[
            "sticky top-0 h-screen",
            "border-r border-white/10",
            "bg-[#071f16]/65 backdrop-blur-xl",
            "shadow-[0_30px_80px_rgba(0,0,0,0.45)]",
            "transition-all duration-300",
            collapsed ? "w-[82px]" : "w-[292px]",
          ].join(" ")}
        >
          <div className="h-full flex flex-col">
            <div className="px-4 pt-5 pb-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-white/10 ring-1 ring-white/10 grid place-items-center text-[#c9a24d] shadow-[0_12px_30px_rgba(0,0,0,0.35)]">
                    <Sparkles className="w-5 h-5" />
                  </div>

                  {!collapsed && (
                    <div className="min-w-0">
                      <div className="text-white font-semibold leading-tight truncate">CeremoDay</div>
                      <div className="text-white/60 text-xs truncate">Wydarzenie • {eventId || "—"}</div>
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => setCollapsed((v) => !v)}
                  className="shrink-0 rounded-xl px-3 py-2 text-white/80 hover:text-white bg-white/5 hover:bg-white/10 ring-1 ring-white/10 transition"
                  aria-label="Zwiń/rozwiń menu"
                >
                  <Menu className="w-5 h-5" />
                </button>
              </div>

              {!collapsed && (
                <div className="mt-4 flex gap-2">
                  <Button variant="secondary" onClick={() => nav(`/event/${eventId}/interview`)}>
                    Edytuj wywiad
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      logout();
                      nav("/login");
                    }}
                  >
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>

            <nav className="px-3 pb-6 overflow-y-auto">
              <div className="grid gap-2">
                {items.map((it) => (
                  <NavLink
                    key={it.key}
                    to={it.to}
                    end={it.key === "overview"} // ważne: aktywność index route
                    className={({ isActive }) =>
                      [
                        "group relative",
                        "flex items-center gap-3",
                        "px-3 py-3",
                        "rounded-xl",
                        "ring-1 ring-white/10",
                        "transition-all duration-200",
                        isActive
                          ? "bg-white/12 shadow-[0_16px_45px_rgba(0,0,0,0.35)]"
                          : "bg-white/5 hover:bg-white/9 hover:shadow-[0_16px_45px_rgba(0,0,0,0.28)]",
                      ].join(" ")
                    }
                  >
                    <div className="w-10 h-10 rounded-lg bg-white/6 ring-1 ring-white/10 grid place-items-center text-[#c9a24d] transition group-hover:scale-[1.02]">
                      {it.icon}
                    </div>

                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium leading-tight truncate">{it.label}</div>
                        <div className="text-white/55 text-xs truncate">{it.badge ? it.badge : "Otwórz moduł"}</div>
                      </div>
                    )}

                    {!collapsed && it.badge && (
                      <div className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/8 text-white/80 ring-1 ring-white/10">
                        {it.badge}
                      </div>
                    )}

                    <div className="absolute left-0 top-1/2 -translate-y-1/2 h-[60%] w-[3px] rounded-full bg-[#c9a24d]/70 opacity-0 group-[.active]:opacity-100" />
                  </NavLink>
                ))}
              </div>
            </nav>

            <div className="mt-auto px-4 pb-5">
              <div className="rounded-xl bg-white/5 ring-1 ring-white/10 p-3">
                {!collapsed ? (
                  <div className="text-white/70 text-xs leading-relaxed">
                    Układ CRM: moduły po lewej, zawartość w kartach pośrodku.
                  </div>
                ) : (
                  <div className="h-6" />
                )}
              </div>
            </div>
          </div>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0">
          <div className="mx-auto max-w-[1280px] px-6 lg:px-10 py-8">
            <div className="rounded-2xl bg-white/[0.06] ring-1 ring-white/10 shadow-[0_30px_90px_rgba(0,0,0,0.40)] backdrop-blur-xl">
              <div className="p-6 md:p-8">
                <Outlet />
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
