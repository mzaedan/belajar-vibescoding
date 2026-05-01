export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export type ApiEnvelope<T> = {
  data: T | null;
  error: ApiError | null;
  meta: Record<string, unknown>;
};

export const success = <T>(
  data: T,
  meta: Record<string, unknown> = {},
): ApiEnvelope<T> => ({
  data,
  error: null,
  meta,
});

export const failure = (
  code: string,
  message: string,
  details?: unknown,
): ApiEnvelope<null> => ({
  data: null,
  error: {
    code,
    message,
    details,
  },
  meta: {},
});
