import type { UiTone } from "../store/ui";

export type UiMessage = {
  tone: UiTone;
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
};

export type UiCode =
  | "INTERVIEW_SAVED"
  | "TASKS_TUNED"
  | "TASKS_REQUIRE_CHECK"
  | "GENERATION_FAILED"
  | "VALIDATION_ERROR";

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function getNumber(meta: unknown, key: string): number | null {
  if (!isRecord(meta)) return null;
  const v = meta[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

export function msg(code: UiCode, meta?: unknown): UiMessage {
  switch (code) {
    case "INTERVIEW_SAVED":
      return {
        tone: "success",
        title: "Zapisano wywiad",
        message: "Ustawienia wydarzenia zostały zaktualizowane.",
      };

    case "TASKS_TUNED": {
      const clamped = getNumber(meta, "clamped");
      return {
        tone: "warning",
        title: "Dostosowaliśmy plan zadań",
        message: clamped
          ? `Część zadań (${clamped}) została przesunięta na dziś, żeby plan był wykonalny.`
          : "Plan zadań został dostrojony do nowych ustawień.",
      };
    }

    case "TASKS_REQUIRE_CHECK":
      return {
        tone: "info",
        title: "Szybkie sprawdzenie",
        message:
          "Do ślubu zostało mało czasu. Przy kolejnej iteracji dodamy check „czy już zrobione?”, żeby nie rozpisywać wszystkiego na ostatnią chwilę.",
      };

    case "GENERATION_FAILED":
      return {
        tone: "danger",
        title: "Nie udało się przeliczyć zadań",
        message: "Spróbuj ponownie. Jeśli błąd wraca, sprawdź wywiad i datę wydarzenia.",
      };

    case "VALIDATION_ERROR":
      return {
        tone: "warning",
        title: "Sprawdź dane",
        message: "Popraw zaznaczone pola i spróbuj ponownie.",
      };

    default:
      return { tone: "info", title: "Informacja" };
  }
}
