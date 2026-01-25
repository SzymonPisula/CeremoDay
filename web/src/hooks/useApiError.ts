// CeremoDay/web/src/hooks/useApiError.ts
import { useMemo, useState } from "react";
import { ApiError } from "../lib/api";

type FieldErrors = Record<string, string>;

type ValidationErrorItem = {
  field?: unknown;
  message?: unknown;
};

type AxiosLikeError = {
  response?: {
    data?: unknown;
  };
  message?: unknown;
  fields?: unknown;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isFieldErrors(v: unknown): v is FieldErrors {
  if (!isRecord(v)) return false;
  for (const val of Object.values(v)) {
    if (typeof val !== "string") return false;
  }
  return true;
}

function isValidationErrorPayload(
  v: unknown
): v is { code: "VALIDATION_ERROR"; errors: ValidationErrorItem[] } {
  if (!isRecord(v)) return false;
  if (v.code !== "VALIDATION_ERROR") return false;
  if (!Array.isArray(v.errors)) return false;
  return true;
}

export function useApiError() {
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);

  function isApiError(err: unknown): err is ApiError {
    return err instanceof ApiError;
  }

  function clearErrors() {
    setFieldErrors({});
    setGlobalError(null);
  }

  function handleError(e: unknown): boolean {
    // 1) ApiError from our api helper
    if (isApiError(e)) {
      setFieldErrors(e.fields ?? {});
      setGlobalError(e.message);
      return true;
    }

    // 2) Generic object-like errors (axios-like or legacy)
    if (isRecord(e)) {
      const err = e as AxiosLikeError;

      // legacy shape: { fields: {..} }
      if (isFieldErrors(err.fields)) {
        setFieldErrors(err.fields);
        setGlobalError(null);
        return true;
      }

      // axios-like: err.response.data
      const dataUnknown = isRecord(err.response) ? err.response.data : undefined;

      if (isValidationErrorPayload(dataUnknown)) {
        const out: FieldErrors = {};
        for (const it of dataUnknown.errors) {
          if (typeof it?.field === "string" && typeof it?.message === "string") {
            out[it.field] = it.message;
          }
        }
        if (Object.keys(out).length > 0) {
          setFieldErrors(out);
          setGlobalError(null);
          return true;
        }
      }

      if (typeof err.message === "string" && err.message.trim()) {
        setGlobalError(err.message);
        return false;
      }
    }

    setGlobalError("Wystąpił nieoczekiwany błąd");
    return false;
  }

  const hasAnyFieldErrors = useMemo(
    () => Object.keys(fieldErrors).length > 0,
    [fieldErrors]
  );

  return { fieldErrors, globalError, hasAnyFieldErrors, handleError, clearErrors };
}
