// Resolves whether visitors can start the secure password-reset flow.

export function isPasswordResetEnabled(value) {
  return String(value || "").trim().toLowerCase() !== "false";
}
