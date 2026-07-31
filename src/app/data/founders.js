// Defines the public Founders policy and the manually verified supporter directory.

export const FOUNDER_PROGRAM = Object.freeze({
  minimumDonationSek: 500,
  launchedAt: "2026-07-31",
});

// Add a record only after the supporter has qualified and approved publication.
export const FOUNDERS = Object.freeze([
  {
    id: "robin-jonsson",
    displayName: "Robin Jonsson",
    recognizedAt: "2026-07-31",
    profileUrl: null,
    qualified: true,
    consentToPublish: true,
  },
]);
