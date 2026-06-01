// Helpers for classifying auth login failures into user-facing error buckets.
export const LOGIN_ERROR_KIND = Object.freeze({
  invalidCredentials: "invalidCredentials",
  invalidInput: "invalidInput",
  serverUnavailable: "serverUnavailable",
  unknown: "unknown",
});

export const classifyLoginError = (error) => {
  const status = Number(error?.status);
  const code = String(error?.code || "");

  if (
    code === "AUTH_NETWORK_ERROR" ||
    code === "AUTH_SERVER_UNAVAILABLE" ||
    code === "AUTH_INVALID_RESPONSE" ||
    code === "AUTH_REQUEST_FAILED" ||
    status >= 500
  ) {
    return LOGIN_ERROR_KIND.serverUnavailable;
  }

  if (code === "INVALID_CREDENTIALS" || status === 401) {
    return LOGIN_ERROR_KIND.invalidCredentials;
  }

  if (code === "INVALID_LOGIN_PAYLOAD" || status === 400) {
    return LOGIN_ERROR_KIND.invalidInput;
  }

  return LOGIN_ERROR_KIND.unknown;
};
