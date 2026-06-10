// Minimal auth error logging helpers for Vercel function diagnostics.

const formatCause = (cause) => {
  if (!cause) return null;
  if (cause instanceof Error) {
    return {
      name: cause.name,
      message: cause.message,
      code: cause.code,
      status: cause.status,
      path: cause.path,
      method: cause.method,
      upstashHost: cause.upstashHost,
    };
  }
  if (typeof cause === "object") {
    return {
      name: cause.name,
      message: cause.message,
      code: cause.code,
      status: cause.status,
      path: cause.path,
      method: cause.method,
      upstashHost: cause.upstashHost,
    };
  }
  return { message: String(cause) };
};

export const logAuthError = ({ route, stage, error, context = {} }) => {
  console.error(`[auth:${route}] request failed`, {
    route,
    stage,
    ...context,
    name: error?.name,
    message: error?.message,
    code: error?.code,
    status: error?.status,
    path: error?.path,
    method: error?.method,
    upstashHost: error?.upstashHost,
    cause: formatCause(error?.cause),
  });
};
