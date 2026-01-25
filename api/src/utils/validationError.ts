export type FieldErrors = Record<string, string>;

export class ValidationError extends Error {
  status = 422;
  fields: FieldErrors;

  constructor(message: string, fields: FieldErrors = {}) {
    super(message);
    this.name = "ValidationError";
    this.fields = fields;
  }
}
