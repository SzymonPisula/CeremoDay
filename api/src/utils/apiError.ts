// /CeremoDay/api/src/utils/apiError.ts

export type ApiErrorFields = Record<string, string>;

export class ApiError extends Error {
  public status: number;
  public code: string;
  public fields?: ApiErrorFields;

  constructor(status: number, code: string, message: string, fields?: ApiErrorFields) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.fields = fields;

    // ważne dla instanceof przy targetach ES5/TS
    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export function isApiError(err: unknown): err is ApiError {
  return err instanceof ApiError;
}

export function apiError(status: number, code: string, message: string, fields?: ApiErrorFields): ApiError {
  return new ApiError(status, code, message, fields);
}
