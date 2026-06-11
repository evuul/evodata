// Shared helpers for safe API error responses and server-side diagnostics.

const DEFAULT_PUBLIC_ERROR = "Servern svarar inte just nu. Försök igen om en stund.";

export const getErrorDiagnostics = (error) => ({
  name: error?.name,
  message: error?.message,
  code: error?.code,
  status: error?.status,
  path: error?.path,
  method: error?.method,
  upstashHost: error?.upstashHost,
});

export const logApiError = ({ route, stage = null, error, context = {} }) => {
  console.error(`[api:${route}] request failed`, {
    route,
    stage,
    ...context,
    ...getErrorDiagnostics(error),
  });
};

export const buildPublicErrorBody = ({
  message = DEFAULT_PUBLIC_ERROR,
  ok = false,
  extra = {},
} = {}) => ({
  ok,
  error: message,
  ...extra,
});
