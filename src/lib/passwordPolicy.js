// Defines the shared password policy for account creation and password changes.

export const MIN_PASSWORD_LENGTH = 12;
export const MAX_PASSWORD_LENGTH = 128;

export function validatePassword(password) {
  const value = typeof password === "string" ? password : "";
  if (value.length < MIN_PASSWORD_LENGTH) {
    return { valid: false, code: "too_short" };
  }
  if (value.length > MAX_PASSWORD_LENGTH) {
    return { valid: false, code: "too_long" };
  }
  return { valid: true, code: null };
}
