// Defines the public Founder capacity and benefits shown consistently across EvoTracker.

export const FOUNDER_PROGRAM = Object.freeze({
  minimumDonationSek: 500,
  claimedFounders: 3,
  maximumFounders: 30,
  launchedAt: "2026-07-31",
  cumulativeDonations: true,
});

export const FOUNDER_BENEFITS = Object.freeze([
  Object.freeze({
    id: "extended-lobby",
    title: Object.freeze({ sv: "Extended lobby", en: "Extended lobby" }),
    description: Object.freeze({
      sv: "Tillgång till Extended lobby med fler Evolution-spel än standardvyn.",
      en: "Access to Extended lobby with more Evolution games than the standard view.",
    }),
  }),
  Object.freeze({
    id: "extended-history",
    title: Object.freeze({ sv: "Längre historik", en: "Extended history" }),
    description: Object.freeze({
      sv: "Tillgång till 1 år och all tillgänglig data i tvåårsvyn för lobby, speltrender, Asia Tracker och ATH.",
      en: "Access to one year and all available data in the two-year view for lobby, game trends, Asia Tracker, and ATH.",
    }),
  }),
  Object.freeze({
    id: "csv-export",
    title: Object.freeze({ sv: "CSV-export", en: "CSV export" }),
    description: Object.freeze({
      sv: "Exportera dagliga snitt för hela lobbyn eller enskilda spel för egen analys.",
      en: "Export daily averages for the full lobby or individual games for your own analysis.",
    }),
  }),
  Object.freeze({
    id: "recognition",
    title: Object.freeze({ sv: "Permanent Founder-status", en: "Permanent Founder status" }),
    description: Object.freeze({
      sv: "Founder-märke på kontot och frivillig plats på Founder-väggen – du styr själv om du vill synas.",
      en: "A Founder account badge and an optional place on the Founders wall—you control whether you appear.",
    }),
  }),
]);
