// Defines the public Premium offer so contribution details stay consistent across the site.

export const PREMIUM_PROGRAM = Object.freeze({
  monthlyDonationSek: 30,
  accessDaysPerMonth: 30,
});

export const PREMIUM_BENEFITS = Object.freeze([
  Object.freeze({
    id: "extended-lobby",
    title: Object.freeze({ sv: "Extended lobby", en: "Extended lobby" }),
    description: Object.freeze({
      sv: "Följ en bredare Evolution-lobby med fler spel och tydligare filtrering.",
      en: "Follow a broader Evolution lobby with more games and clearer filtering.",
    }),
  }),
  Object.freeze({
    id: "extended-history",
    title: Object.freeze({ sv: "Längre historik", en: "Extended history" }),
    description: Object.freeze({
      sv: "Se längre tidsserier i lobbyn, speltrender, Asia Tracker och ATH.",
      en: "See longer time series in the lobby, game trends, Asia Tracker, and ATH.",
    }),
  }),
  Object.freeze({
    id: "csv-export",
    title: Object.freeze({ sv: "CSV-export", en: "CSV export" }),
    description: Object.freeze({
      sv: "Exportera data för hela lobbyn eller enskilda spel till egen analys.",
      en: "Export full-lobby or individual-game data for your own analysis.",
    }),
  }),
]);
