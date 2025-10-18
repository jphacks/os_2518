export type ApiSuccess<T> = {
  success: true;
  data: T;
};

export type ApiFailure = {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export class ApiError extends Error {
  public readonly code: string;
  public readonly status: number;
  public readonly details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

type ApiOptions = RequestInit & { parseJson?: boolean };

const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};

export async function apiFetch<T>(path: string, options: ApiOptions = {}): Promise<T> {
  const { parseJson = true, headers, ...rest } = options;
  const isFormData = rest.body instanceof FormData;

  const resolvedHeaders = isFormData ? headers ?? {} : { ...DEFAULT_HEADERS, ...headers };

  const response = await fetch(`/api/v1${path}`, {
    credentials: 'include',
    headers: resolvedHeaders,
    ...rest,
  });

  if (!parseJson) {
    if (!response.ok) {
      throw new ApiError('HTTP_ERROR', response.statusText || 'Request failed', response.status);
    }
    return undefined as T;
  }

  const payload = ((await response.json().catch(() => null)) ?? {}) as ApiSuccess<T> | ApiFailure;

  if (!response.ok || payload?.success === false) {
    const errorPayload = payload && 'error' in payload ? payload.error : { code: 'UNKNOWN', message: 'Unknown error' };
    throw new ApiError(errorPayload.code, errorPayload.message, response.status, errorPayload.details);
  }

  return (payload as ApiSuccess<T>).data;
}
