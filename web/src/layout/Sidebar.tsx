// web/src/layout/Sidebar.tsx
import { useEffect, useMemo } from "react";
import { NavLink } from "react-router-dom";
import { cn } from "../theme/helpers";
import type { ReactNode } from "react";

import {
  Home,
  LayoutDashboard,
  Users,
  FileText,
  MapPin,
  Sparkles,
  CheckSquare,
  Wallet,
  BarChart3,
  Compass,
  UserCircle2,
  UserCog,
  CalendarHeart,
} from "lucide-react";

type SidebarProps = {
  eventId: string | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;

  topbarHeightPx: number;
  topbarGapPx: number;

  // ✅ sterowane wywiadem eventu
  weddingDayEnabled?: boolean;
};

type Item = {
  label: string;
  to: string;
  icon: ReactNode;
  end?: boolean;
  separatorAfter?: boolean;
};

const ICON_CLASS = "w-5 h-5 text-[rgba(246,226,122,0.95)]";

function buildItems(eventId: string | null, weddingDayEnabled: boolean): Item[] {
  const items: Item[] = [
    {
      label: "Moje wydarzenia",
      to: "/dashboard",
      icon: <Home className={ICON_CLASS} />,
      end: true,
      separatorAfter: false,
    },
    {
      label: "Mój profil",
      to: "/profile",
      icon: <UserCircle2 className={ICON_CLASS} />,
      end: true,
      separatorAfter: true,
    },
  ];

  if (eventId) {
    const base = `/event/${eventId}`;

    items.push(
      {
        label: "Panel wydarzenia",
        to: base,
        icon: <LayoutDashboard className={ICON_CLASS} />,
        end: true,
      },
      { label: "Użytkownicy", to: `${base}/users`, icon: <UserCog className={ICON_CLASS} /> },
      { label: "Goście", to: `${base}/guests`, icon: <Users className={ICON_CLASS} /> },
      { label: "Dokumenty", to: `${base}/documents`, icon: <FileText className={ICON_CLASS} /> },
      { label: "Usługodawcy", to: `${base}/vendors`, icon: <MapPin className={ICON_CLASS} /> },
      { label: "Inspiracje", to: `${base}/inspirations`, icon: <Sparkles className={ICON_CLASS} /> },
      { label: "Zadania", to: `${base}/tasks`, icon: <CheckSquare className={ICON_CLASS} /> },
      { label: "Finanse", to: `${base}/finance`, icon: <Wallet className={ICON_CLASS} /> },
      { label: "Raporty", to: `${base}/reports`, icon: <BarChart3 className={ICON_CLASS} /> },

      // ✅ TYLKO jeśli włączone w wywiadzie
      ...(weddingDayEnabled
        ? [{ label: "Dzień ślubu", to: `${base}/wedding-day`, icon: <CalendarHeart className={ICON_CLASS} /> }]
        : []),

      { label: "Wywiad (Edycja)", to: `${base}/interview`, icon: <Compass className={ICON_CLASS} /> }
    );
  }

  return items;
}

export default function Sidebar({
  eventId,
  open,
  onOpenChange,
  topbarHeightPx,
  topbarGapPx,
  weddingDayEnabled,
}: SidebarProps) {
  const items = useMemo(() => buildItems(eventId, !!weddingDayEnabled), [eventId, weddingDayEnabled]);

  const topbarTop = topbarGapPx;
  const sidebarDockTop = topbarTop + topbarHeightPx;

  const linkBase =
    "flex items-center gap-3 rounded-[18px] px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.35)]";

  // ✅ zamykanie na scroll (wheel/touchpad)
  useEffect(() => {
    if (!open) return;

    const close = () => onOpenChange(false);
    window.addEventListener("wheel", close, { passive: true });
    window.addEventListener("touchmove", close, { passive: true });

    return () => {
      window.removeEventListener("wheel", close);
      window.removeEventListener("touchmove", close);
    };
  }, [open, onOpenChange]);

  return (
    <>
      {/* ✅ OVERLAY (mobile + desktop) */}
      <div
        className={cn(
          "fixed inset-0 z-40 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0"
        )}
        onClick={() => onOpenChange(false)}
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* ✅ DRAWER */}
      <aside
        className={cn(
          "fixed left-0 z-50 w-[300px] transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full"
        )}
        style={{
          top: sidebarDockTop,
          height: `calc(100vh - ${sidebarDockTop}px)`,
        }}
      >
        <div className="h-full px-3 pb-4 pt-3">
          <div
            className={cn(
              "h-full rounded-[26px] border border-white/10",
              "bg-[rgba(10,40,28,0.60)] backdrop-blur-[10px]",
              "shadow-[0_18px_50px_rgba(0,0,0,0.28)] overflow-hidden"
            )}
            onClick={(e) => e.stopPropagation()}
            role="presentation"
          >
            <nav className="p-2 pt-3 space-y-1">
              {items.map((item) => (
                <div key={item.to}>
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      cn(linkBase, isActive ? "bg-[rgba(212,175,55,0.14)]" : "hover:bg-white/5")
                    }
                    onClick={() => onOpenChange(false)}
                  >
                    <span className="inline-flex items-center justify-center">{item.icon}</span>
                    <span>{item.label}</span>
                  </NavLink>

                  {item.separatorAfter && <div className="my-3 mx-2 h-px bg-white/10" />}
                </div>
              ))}
            </nav>
          </div>
        </div>
      </aside>
    </>
  );
}
