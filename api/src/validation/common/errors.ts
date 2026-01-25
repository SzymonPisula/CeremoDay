export type ValidationErrorItem = {
  field: string;
  message: string;
  rule: string;
};

export class ValidationException extends Error {
  code = "VALIDATION_ERROR";
  status = 400;
  errors: ValidationErrorItem[];

  constructor(errors: ValidationErrorItem[]) {
    super("Validation error");
    this.errors = errors;
  }
}