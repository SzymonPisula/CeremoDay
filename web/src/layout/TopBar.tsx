import Button from "../ui/Button";
import { cn } from "../theme/helpers";
import { useAuthStore } from "../store/auth";
import { useNavigate } from "react-router-dom";
import LogoutIcon from "../ui/icons/LogoutIcon";

type TopBarProps = {
  title: string;
  onMenu: () => void;
  eventId: string | null;
  eventName: string | null;
};

export default function TopBar({ title, onMenu, eventId, eventName }: TopBarProps) {
  const navigate = useNavigate();
  const logout = useAuthStore((s) => s.logout);

  const subtitle =
    eventId && eventName ? `Wydarzenie: ${eventName}` : eventId ? `Wydarzenie: ${eventId}` : "";

  const handleLogout = () => {
    logout();
    localStorage.removeItem("token");
    navigate("/login", { replace: true });
  };

  const handleGoToEventPanel = () => {
    if (!eventId) return;
    navigate(`/event/${eventId}`);
  };

  return (
    <div className="pt-4 px-4 lg:px-6">
      <div className="mx-auto w-full max-w-[1280px]">
        <div
          className={cn(
            "relative rounded-[26px] border border-white/10",
            "bg-[rgba(10,40,28,0.22)] shadow-[0_18px_50px_rgba(0,0,0,0.28)] backdrop-blur-[10px]"
          )}
        >
          <div className="flex items-center gap-3 px-3 sm:px-4 py-3">
            {/* LEFT: klik gdziekolwiek = otwórz menu */}
            <button
              type="button"
              onClick={onMenu}
              className={cn(
                "flex items-center gap-3 text-left",
                "h-12 rounded-[18px] px-3",
                "bg-[rgba(255,255,255,0.04)] hover:bg-[rgba(255,255,255,0.07)] transition",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(212,175,55,0.35)]",
                "min-w-0" // ✅ nie wymuszaj 260px na mobile
              )}
              aria-label="Otwórz menu"
              title="Otwórz menu"
            >
              <div className="relative h-12 w-12 shrink-0">
                <img
                  src="/logo_bez_napisu.png"
                  alt="CeremoDay"
                  draggable={false}
                  className="absolute left-1/2 top-1/2 h-12 w-12 -translate-x-1/2 -translate-y-1/2 object-contain pointer-events-none"
                />
              </div>

              {/* tekst ukryj na bardzo wąskich */}
              <div className="hidden sm:block leading-tight min-w-0">
                <div className="text-sm font-semibold text-white/90 truncate">CeremoDay</div>
                <div className="text-xs text-white/60 truncate">Wedding planner</div>
              </div>

              <span
                className={cn(
                  "ml-1 inline-flex items-center justify-center",
                  "h-8 w-8 rounded-[14px] border border-white/10 bg-white/5",
                  "text-white/80 text-sm"
                )}
                aria-hidden="true"
              >
                ≡
              </span>
            </button>

            {/* CENTER */}
            <div className="flex-1 min-w-0 text-center px-1 sm:px-2">
              <div className="text-sm font-semibold text-white truncate">{title}</div>
              {subtitle ? <div className="text-xs text-white/60 mt-0.5 truncate">{subtitle}</div> : null}
            </div>

            {/* RIGHT */}
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              {eventId ? (
                <Button variant="ghost" onClick={handleGoToEventPanel} className="px-3">
                  <span className="hidden sm:inline">Panel wydarzenia</span>
                  <span className="sm:hidden">Panel</span>
                </Button>
              ) : null}

              <Button
  variant="secondary"
  onClick={handleLogout}
  className="inline-flex items-center gap-2"
>
  <span className="hidden lg:inline">Wyloguj</span>
  <LogoutIcon size={18} className="text-white/80" />

</Button>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
