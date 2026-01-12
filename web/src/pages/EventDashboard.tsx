import { useMemo } from "react";
import { useNavigate, useParams, useOutletContext } from "react-router-dom";
import {
  Users,
  FileText,
  Wallet,
  BarChart3,
  CalendarDays,
  MapPin,
  Bell,
  Sparkles,
  Pencil,
  ArrowRight,
} from "lucide-react";

import PageLayout from "../layout/PageLayout";
import Tile from "../ui/Tile";
import Button from "../ui/Button";
import Card from "../ui/Card";
import type { AppLayoutOutletContext } from "../layout/AppLayout";


type Params = { id?: string };

export default function EventDashboard() {
  const { id: eventId } = useParams<Params>();
  const nav = useNavigate();

  // ✅ Bezpiecznie: outletContext może być undefined jeśli ktoś użyje strony poza AppLayout
  const ctx = useOutletContext<AppLayoutOutletContext | undefined>();
  const eventName = ctx?.eventName ?? null;

  const modules = useMemo(
    () =>
      [
        {
          key: "guests",
          title: "Goście",
          subtitle: "Lista, RSVP, podgoście, alergeny.",
          icon: <Users className="w-5 h-5" />,
          to: `/event/${eventId}/guests`,
        },
        {
          key: "documents",
          title: "Dokumenty",
          subtitle: "Checklisty, pliki, statusy.",
          icon: <FileText className="w-5 h-5" />,
          to: `/event/${eventId}/documents`,
        },
        {
          key: "finance",
          title: "Finanse",
          subtitle: "Budżet, koszty, płatności.",
          icon: <Wallet className="w-5 h-5" />,
          to: `/event/${eventId}/finance`,
        },
        {
          key: "reports",
          title: "Raporty",
          subtitle: "Podsumowania i statystyki.",
          icon: <BarChart3 className="w-5 h-5" />,
          to: `/event/${eventId}/reports`,
        },
        {
          key: "schedule",
          title: "Harmonogram",
          subtitle: "Plan dnia i zadania czasowe.",
          icon: <CalendarDays className="w-5 h-5" />,
          to: `/event/${eventId}/schedule`,
        },
        {
          key: "vendors",
          title: "Usługodawcy",
          subtitle: "Firmy + sale gminne.",
          icon: <MapPin className="w-5 h-5" />,
          to: `/event/${eventId}/vendors`,
        },
        {
          key: "notifications",
          title: "Powiadomienia",
          subtitle: "Przypomnienia i alerty.",
          icon: <Bell className="w-5 h-5" />,
          to: `/event/${eventId}/notifications`,
        },
        {
          key: "inspirations",
          title: "Inspiracje",
          subtitle: "Tablice i moodboard.",
          icon: <Sparkles className="w-5 h-5" />,
          to: `/event/${eventId}/inspirations`,
        },
      ] as const,
    [eventId]
  );

  const safeEventId = eventId ?? "";
  const canNavigate = Boolean(eventId);

  const pageTitle = eventName?.trim() ? eventName : `Wydarzenie #${safeEventId}`;

  return (
    <PageLayout
      title={pageTitle}
      subtitle="Twoje miejsce na szybki dostęp do wybranych modułów."
      actions={
        <div className="flex items-center gap-3">
          <Button
            variant="secondary"
            onClick={() => canNavigate && nav(`/event/${eventId}/interview/edit`)}
            disabled={!canNavigate}
          >
            <Pencil className="w-4 h-4" />
            Edytuj wywiad
          </Button>
          <Button variant="ghost" onClick={() => nav("/dashboard")}>
            Powrót do twoich wydarzeń
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-6">
        <Card className="p-5 md:p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-white/70">Moduły</div>
              <div className="text-lg font-semibold text-white">Wybierz obszar</div>
            </div>
            <div className="text-xs text-white/60">Kliknij kafelek aby otworzyć</div>
          </div>

          <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {modules.map((m) => (
              <Tile
                key={m.key}
                title={m.title}
                subtitle={m.subtitle}
                icon={m.icon}
                onClick={() => canNavigate && nav(m.to)}
                className={!canNavigate ? "opacity-60" : undefined}
              >
                <div className="mt-4 inline-flex items-center gap-2 text-sm text-[var(--cd-gold)]">
                  Otwórz <ArrowRight className="w-4 h-4" />
                </div>
              </Tile>
            ))}
          </div>
        </Card>

        <div className="space-y-6">
          <Card className="p-5 md:p-6">
            <div className="text-sm text-white/70">Szybkie akcje</div>
            <div className="mt-1 text-lg font-semibold text-white">Najczęstsze rzeczy</div>

            <div className="mt-5 grid grid-cols-1 gap-3">
              <Button onClick={() => canNavigate && nav(`/event/${eventId}/guests`)} disabled={!canNavigate}>
                <Users className="w-4 h-4" />
                Przejdź do listy gości
              </Button>
              <Button
                variant="secondary"
                onClick={() => canNavigate && nav(`/event/${eventId}/vendors`)}
                disabled={!canNavigate}
              >
                <MapPin className="w-4 h-4" />
                Dodaj usługodawcę
              </Button>
              <Button
                variant="ghost"
                onClick={() => canNavigate && nav(`/event/${eventId}/documents`)}
                disabled={!canNavigate}
              >
                <FileText className="w-4 h-4" />
                Otwórz dokumenty
              </Button>
            </div>
          </Card>

          <Card className="p-5 md:p-6">
            <div className="text-sm text-white/70">Podpowiedź</div>
            <div className="mt-1 text-white/90">
              Zaczynaj od gości i usługodawców, a potem dopinaj harmonogram.
            </div>
            <div className="mt-4 text-xs text-white/60">
              Ten panel w przyszłości wypełnimy statystykami (np. liczba gości, RSVP, budżet).
            </div>
          </Card>
        </div>
      </div>
    </PageLayout>
  );
}
