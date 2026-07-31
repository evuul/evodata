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
]);
