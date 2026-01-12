import React, { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { api } from "../lib/api";
import type { InterviewResponse } from "../types/interview";

type Props = {
  children: React.ReactNode;
};

export default function RequireInterview({ children }: Props) {
  const { id: eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [checking, setChecking] = useState(true);

  useEffect(() => {
    if (!eventId) return;

    let alive = true;

    (async () => {
      setChecking(true);

      try {
        const path = location.pathname;

        // ✅ wywiad (start i edycja) ma być zawsze dostępny
        const isInterviewRoute =
          path.includes(`/event/${eventId}/interview`) ||
          path === `/event/${eventId}/interview/start`;

        if (isInterviewRoute) {
          if (alive) setChecking(false);
          return;
        }

        const interview = (await api.getInterview(eventId)) as InterviewResponse | null;

        if (!alive) return;

        if (!interview) {
          navigate(`/event/${eventId}/interview/start`, { replace: true });
          return;
        }

        setChecking(false);
      } catch {
        if (!alive) return;
        navigate(`/event/${eventId}/interview/start`, { replace: true });
      }
    })();

    return () => {
      alive = false;
    };
  }, [eventId, location.pathname, navigate]);

  // ważne: nie renderujemy eventu zanim nie sprawdzimy
  if (checking) return null;

  return <>{children}</>;
}
