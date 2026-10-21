// Covers public content, language, account forms and dashboard shortcuts with mocked APIs.

import { test, expect } from "@playwright/test";

const testUser = { email: "browser-test@example.com", firstName: "Test", lastName: "User", isSubscriber: false, isAdmin: false, profile: { shares: 0, avgCost: 0 } };

async function mockApis(page, { signedIn = false } = {}) {
  let authenticated = signedIn;
  await page.route("**/api/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.startsWith("/api/calendar/")) return route.continue();
    if (path === "/api/auth/session") return route.fulfill({ json: { authenticated, user: authenticated ? testUser : null } });
    if (path === "/api/auth/login" || path === "/api/auth/register") {
      authenticated = true;
      return route.fulfill({ json: { user: testUser } });
    }
    if (path === "/api/extended-lobby") return route.fulfill({ status: 503, json: { error: "Test service unavailable" } });
    return route.fulfill({ json: { items: [], data: [], games: [], current: [], latest: [], totalPercent: 0 } });
  });
}

test.beforeEach(async ({ page }) => {
  await mockApis(page);
});

test("public introduction and account comparison arrive in server HTML", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBeTruthy();
  const html = await response.text();
  expect(html).toContain("Från live-lobby till");
  expect(html).toContain("Jämförelse av kontonivåer");
  expect(html).toContain('href="/privacy"');
});

test("public introduction remains useful when JavaScript is disabled", async ({ browser, baseURL }) => {
  const context = await browser.newContext({ baseURL, javaScriptEnabled: false, locale: "sv-SE" });
  try {
    const page = await context.newPage();
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Från live-lobby till");
    await expect(page.getByRole("table", { name: "Jämförelse av kontonivåer" })).toBeVisible();
  } finally {
    await context.close();
  }
});

test("language selection tolerates blocked local storage and works from the keyboard", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
    Storage.prototype.setItem = () => { throw new DOMException("Storage blocked", "SecurityError"); };
  });
  await page.goto("/");
  const english = page.getByRole("button", { name: "EN", exact: true });
  await english.focus();
  await english.press("Space");
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(english).toBeFocused();
  expect(errors).toEqual([]);
});

test("examples are readable and public layout fits the viewport", async ({ page }) => {
  await page.goto("/");
  const example = page.getByRole("figure", { name: "Så kan din översikt se ut" });
  await expect(example.getByText("68 420", { exact: true })).toBeVisible();
  await expect(example.getByText(/påhittade värden/)).toBeVisible();
  await expect(example.getByText("Uppdateras automatiskt")).toHaveCount(0);
  await expect(page.getByRole("table", { name: "Jämförelse av kontonivåer" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBeTruthy();
});

test("language updates document semantics and survives reload", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("From live lobby");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
});

test("public information stays available without a session request", async ({ page }) => {
  const sessionRequests = [];
  page.on("request", (request) => { if (request.url().includes("/api/auth/session")) sessionRequests.push(request.url()); });
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Integritet och dina uppgifter");
  await page.getByRole("link", { name: "Metodik & FAQ", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Metodik och datakällor");
  expect(sessionRequests).toHaveLength(0);
});

test("calendar downloads preserve confirmed dates and reject unknown entries", async ({ page, request }) => {
  await page.goto("/calendar");
  await expect(page.getByText("Bokslutskommuniké 2026", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Lägg till i kalender: Bokslutskommuniké 2026", exact: true })).toHaveAttribute("href", "/api/calendar/year-end-report-2026?locale=sv");
  const response = await request.get("/api/calendar/year-end-report-2026?locale=en");
  expect(response.headers()["content-type"]).toContain("text/calendar");
  expect(await response.text()).toContain("DTSTART;VALUE=DATE:20270204");
  expect((await request.get("/api/calendar/unknown")).status()).toBe(404);
});

test("registration validates passwords before creating an account", async ({ page }) => {
  let submissions = 0;
  page.on("request", (request) => { if (request.url().endsWith("/api/auth/register")) submissions += 1; });
  await page.goto("/register");
  await page.getByRole("textbox", { name: "Förnamn" }).fill("Test");
  await page.getByRole("textbox", { name: "Efternamn" }).fill("User");
  await page.getByRole("textbox", { name: "E-post" }).fill(testUser.email);
  await page.getByLabel(/^Lösenord/).fill("test-only-passphrase-123");
  await page.getByLabel(/^Bekräfta lösenord/).fill("different-passphrase-123");
  await page.getByRole("button", { name: "Registrera mig", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Lösenorden matchar inte" })).toBeVisible();
  expect(submissions).toBe(0);
  await page.getByLabel(/^Bekräfta lösenord/).fill("test-only-passphrase-123");
  await page.getByRole("button", { name: "Registrera mig", exact: true }).click();
  await expect(page).toHaveURL(/\/$|\/?\?onboarding=1$/);
  expect(submissions).toBe(1);
});

test("login explains server errors and allows retry", async ({ page }) => {
  let attempts = 0;
  await page.route("**/api/auth/login", (route) => {
    attempts += 1;
    return route.fulfill(attempts === 1 ? { status: 503, json: { error: "Unavailable" } } : { json: { user: testUser } });
  });
  await page.goto("/login?next=%2F%3Fpanel%3Dcalendar");
  await page.getByRole("textbox", { name: "E-post" }).fill(testUser.email);
  await page.getByLabel(/^Lösenord/).fill("test-only-passphrase-123");
  await page.getByRole("button", { name: "Logga in", exact: true }).click();
  await expect(page.getByRole("alert").filter({ hasText: /Inloggningsservern/ })).toBeVisible();
  await page.getByRole("button", { name: "Logga in", exact: true }).click();
  await expect(page).toHaveURL(/panel=calendar/);
  await expect(page.getByRole("heading", { name: "Finansiell kalender", exact: true })).toBeVisible();
});

test("authenticated favourites persist and panel switching works on mobile and desktop", async ({ page }, testInfo) => {
  await mockApis(page, { signedIn: true });
  await page.goto("/?panel=calendar");
  const favorite = page.getByRole("button", { name: "Spara Kalender som favorit", exact: true });
  await favorite.click();
  await expect(page.getByRole("button", { name: "Ta bort Kalender från favorit", exact: true })).toHaveAttribute("aria-pressed", "true");
  await page.reload();
  await expect(page.getByRole("button", { name: "Ta bort Kalender från favorit", exact: true })).toHaveAttribute("aria-pressed", "true");
  if (testInfo.project.name === "mobile") {
    await page.getByRole("combobox", { name: "Välj dashboardvy" }).click();
    await page.getByRole("option", { name: "Metodik & FAQ", exact: true }).click();
  } else {
    await page.getByRole("button", { name: "Metodik & FAQ", exact: true }).click();
  }
  await expect(page).toHaveURL(/panel=faq/);
  await page.getByRole("navigation", { name: "Favoritvyer" }).getByRole("button", { name: "Kalender", exact: true }).click();
  await expect(page).toHaveURL(/panel=calendar/);
});

test("data failures show a useful message without crashing the dashboard", async ({ page }) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await mockApis(page, { signedIn: true });
  await page.route("**/api/auth/session", (route) => route.fulfill({ json: { authenticated: true, user: { ...testUser, isSubscriber: true } } }));
  await page.goto("/?panel=extended");
  await expect(page.getByText("Test service unavailable", { exact: true })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Favoritvyer" })).toBeVisible();
  expect(errors).toEqual([]);
});

test("financial charts disclose the report source and period", async ({ page }) => {
  await mockApis(page, { signedIn: true });
  await page.goto("/?panel=financial");
  await expect(page.getByRole("link", { name: "Källa: Evolutions rapporter", exact: true })).toBeVisible();
  await expect(page.getByRole("note", { name: "Datakälla och status" }).filter({ hasText: "Rapporterat" }).last()).toContainText(/Q[1-4] 20\d{2}/);
});
