export type FieldErrors = Record<string, string>;

export class ApiError extends Error {
  status: number;
  code: string;
  fields?: FieldErrors;

  constructor(status: number, code: string, message: string, fields?: FieldErrors) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export function isApiError(e: unknown): e is ApiError {
  return typeof e === "object" && e !== null && "code" in e && "status" in e;
}
