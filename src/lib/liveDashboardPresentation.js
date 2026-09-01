// Shared responsive presentation rules for the live-data dashboard.

export const MOBILE_CHART_MARGIN = Object.freeze({ top: 8, right: 8, left: 0, bottom: 0 });
export const MOBILE_PLAYER_AXIS_WIDTH = 48;

export function mobileAccentFrameSx(accentColor) {
  return {
    position: "relative",
    border: {
      xs: "1px solid rgba(148,163,184,0.12)",
      sm: "1px solid transparent",
    },
    boxShadow: {
      xs: "none",
      sm: `inset 0 0 0 1px ${accentColor}`,
    },
    "&::before": {
      content: '\"\"',
      position: "absolute",
      display: { xs: "block", sm: "none" },
      top: 0,
      left: 18,
      right: 18,
      height: 2,
      borderRadius: "999px",
      backgroundColor: accentColor,
      pointerEvents: "none",
    },
  };
}
