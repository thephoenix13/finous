/** What the UI branches on. "conflict" is for a choice another bank already holds, such as a web address. */
export type ApiErrorCode = "unauthorized" | "not_found" | "conflict" | "unavailable";

const STATUS: Record<ApiErrorCode, number> = { unauthorized: 401, not_found: 404, conflict: 409, unavailable: 503 };

/** What every failed call rejects with, mock or real. A cancelled call rejects with an AbortError instead. */
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
