// Defines the private, manually verified supporter directory.

export { FOUNDER_PROGRAM } from "../../config/founderProgram.js";

// Add a record only after the supporter has qualified and approved publication.
export const FOUNDERS = Object.freeze([
  {
    id: "robin-jonsson",
    accountEmail: "robinjonsson64@gmail.com",
    displayName: "Robin Jonsson",
    recognizedAt: "2026-07-31",
    profileUrl: null,
    qualified: true,
    consentToPublish: false,
  },
  {
    id: "halvard-bagoien",
    accountEmail: "halvard.bagoien@gmail.com",
    displayName: "Halvard Bagoien",
    recognizedAt: "2026-08-18",
    profileUrl: null,
    qualified: true,
    consentToPublish: true,
  },
  {
    id: "carl-lindblom",
    accountEmail: "carl.lindblom@gmail.com",
    displayName: "Carl Lindblom",
    recognizedAt: "2026-09-01",
    profileUrl: null,
    qualified: true,
    consentToPublish: false,
  },
]);
