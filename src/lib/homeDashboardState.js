// Resolves the home dashboard view without treating initialization gaps as errors.

export const dashboardVariantForAuth = (isAuthenticated) =>
  isAuthenticated ? "authenticated" : "public";

export function resolveHomeDashboardView({ initialized, isAuthenticated, dashboardState } = {}) {
  if (!initialized) return "loading";

  const expectedVariant = dashboardVariantForAuth(isAuthenticated);
  if (dashboardState?.variant !== expectedVariant) return "loading";
  if (dashboardState?.status === "error") return "error";
  if (dashboardState?.status !== "success") return "loading";
  if (dashboardState?.value == null) return "error";
  return expectedVariant;
}
