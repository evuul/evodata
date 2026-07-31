// Defines which routes may start authenticated dashboard data polling.

export function shouldEnableAuthenticatedLiveData(pathname) {
  if (pathname === "/") return true;
  return typeof pathname === "string" && (pathname === "/mina-sidor" || pathname.startsWith("/mina-sidor/"));
}

export function shouldRestoreAuthSession(pathname) {
  return pathname !== "/founders" && pathname !== "/disclaimer";
}
