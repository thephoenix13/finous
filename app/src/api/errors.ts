export type ApiErrorCode = "unauthorized" | "not_found" | "unavailable";

const STATUS: Record<ApiErrorCode, number> = { unauthorized: 401, not_found: 404, unavailable: 503 };

/**
 * What every failed call rejects with, mock or real. `code` is what the UI branches on;
 * `status` is the HTTP status the real backend uses for it. A cancelled call rejects with an AbortError instead.
 */
export class ApiError extends Error {
  readonly code: ApiErrorCode;
  readonly status: number;

  constructor(code: ApiErrorCode, message: string = code) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = STATUS[code];
  }
}

export const isApiError = (error: unknown): error is ApiError => error instanceof ApiError;
