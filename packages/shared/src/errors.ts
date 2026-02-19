export enum ErrorCode {
  ValidationError = "VALIDATION_ERROR",
  NotFound = "NOT_FOUND",
  ProviderError = "PROVIDER_ERROR",
  ProviderRateLimit = "PROVIDER_RATE_LIMIT",
  ProviderValidationError = "PROVIDER_VALIDATION_ERROR",
  ProviderInternalError = "PROVIDER_INTERNAL_ERROR",
  BudgetExceeded = "BUDGET_EXCEEDED",
  RunFailed = "RUN_FAILED",
  Unauthorized = "UNAUTHORIZED",
  Conflict = "CONFLICT",
  InternalError = "INTERNAL_ERROR",
}

export class AppError extends Error {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = "AppError";
  }

  toJSON() {
    return {
      error: this.code,
      message: this.message,
      details: this.details,
    };
  }
}
