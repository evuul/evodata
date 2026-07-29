// Resolves the optional demo account without providing an insecure default password.

const DEMO_EMAIL = "demo@evotracker.org";

export function resolveDemoAccountConfig(env = process.env) {
  const password = String(env.DEMO_ACCOUNT_PASSWORD || "");
  if (!password) return null;

  return {
    email: DEMO_EMAIL,
    password,
  };
}

export function isDemoLogin({ email, password }, config) {
  if (!config) return false;
  return email === config.email && password === config.password;
}
