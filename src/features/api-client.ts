/**
 * Small browser-side helper for the app's JSON API.
 *
 * Every route handler answers with `{ data }` or
 * `{ error: { code, message, fieldErrors? } }`, so one parser serves them all
 * and keeps fetch/parse noise out of the components.
 */

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly fieldErrors: Record<string, string[]>;

  constructor(
    code: string,
    message: string,
    status: number,
    fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.fieldErrors = fieldErrors;
  }

  /** First message for a field, for inline form errors. */
  fieldError(field: string): string | undefined {
    return this.fieldErrors[field]?.[0];
  }
}

type ApiEnvelope<T> = {
  data?: T;
  error?: { code?: string; message?: string; fieldErrors?: Record<string, string[]> };
};

async function request<T>(
  url: string,
  init: RequestInit & { signal?: AbortSignal },
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
  } catch (error) {
    if (init.signal?.aborted) throw error;
    throw new ApiError(
      "NETWORK_ERROR",
      "We couldn't reach the server. Check your connection and try again.",
      0,
    );
  }

  let body: ApiEnvelope<T> | null = null;
  try {
    body = (await response.json()) as ApiEnvelope<T>;
  } catch {
    // Keep body null; handled below.
  }

  if (!response.ok) {
    throw new ApiError(
      body?.error?.code ?? "UNKNOWN_ERROR",
      body?.error?.message ?? `Request failed with HTTP ${response.status}`,
      response.status,
      body?.error?.fieldErrors ?? {},
    );
  }
  if (!body || body.data === undefined) {
    throw new ApiError("INVALID_RESPONSE", "The server returned an unexpected response.", response.status);
  }
  return body.data;
}

export function getJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return request<T>(url, { method: "GET", signal });
}

export function postJson<T>(url: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(url, { method: "POST", body: JSON.stringify(payload), signal });
}

export function patchJson<T>(url: string, payload: unknown, signal?: AbortSignal): Promise<T> {
  return request<T>(url, { method: "PATCH", body: JSON.stringify(payload), signal });
}

export function deleteJson<T>(url: string, signal?: AbortSignal): Promise<T> {
  return request<T>(url, { method: "DELETE", signal });
}
