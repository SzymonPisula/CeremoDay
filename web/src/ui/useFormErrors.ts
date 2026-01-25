// /CeremoDay/web/src/ui/useFormErrors.ts
import { useCallback, useMemo, useState } from "react";

type FieldErrors = Record<string, string>;

type ApiErrorLike = {
  message?: string;
  fields?: Record<string, string>;
  details?: Record<string, string>; // jeśli gdzieś jeszcze wraca "details"
};

export function useFormErrors(labelOverrides?: Record<string, string>) {
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrorsState] = useState<FieldErrors>({});

  const labelMap = useMemo<Record<string, string>>(() => {
    const base: Record<string, string> = {
      first_name: "Imię",
      last_name: "Nazwisko",
      phone: "Telefon",
      email: "Email",
      relation: "Relacja",
      side: "Strona",
      rsvp: "RSVP",
      allergens: "Alergeny",
      notes: "Notatki",
      parent_guest_id: "Osoba kontaktowa",
      _global: "Błąd",
    };
    return { ...base, ...(labelOverrides ?? {}) };
  }, [labelOverrides]);

  const clear = useCallback(() => {
    setFormError(null);
    setFieldErrorsState({});
  }, []);

  const clearField = useCallback((field: string) => {
    setFieldErrorsState((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  const setFieldErrors = useCallback((errors: FieldErrors) => {
    setFieldErrorsState(errors);
  }, []);

  const setFromApiError = useCallback(
    (err: unknown, fallbackMessage: string) => {
      const e = err as ApiErrorLike;

      // backend: { fields: { field: msg } }
      const fields = e?.fields ?? e?.details;
      if (fields && typeof fields === "object") {
        const next: FieldErrors = {};
        for (const [k, v] of Object.entries(fields)) {
          if (!v) continue;
          const label = labelMap[k] ?? k;
          // jeśli backend zwrócił już “po ludzku” -> zostaw; jeśli technicznie -> opisz pole
          next[k] = v.includes(label) ? v : `${label}: ${v}`;
        }

        setFieldErrorsState(next);

        // globalny banner: krótki
        const global = fields["_global"];
        if (typeof global === "string" && global.trim().length) {
          setFormError(global);
        } else {
          setFormError("Popraw zaznaczone pola w formularzu.");
        }
        return;
      }

      if (typeof e?.message === "string" && e.message.trim().length) {
        setFormError(e.message);
        return;
      }

      setFormError(fallbackMessage);
    },
    [labelMap]
  );

  return {
    formError,
    fieldErrors,
    setFormError,
    setFieldErrors,     // ✅ nowa metoda
    setFromApiError,
    clear,
    clearField,         // ✅ przy zmianie pola usuwamy błąd
  };
}
