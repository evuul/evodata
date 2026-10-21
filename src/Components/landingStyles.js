// Shared visual tokens for the public product preview and landing page.

export const colors = {
  border: "rgba(148, 163, 184, 0.18)",
  surface: "#111c2e",
  text: "#f8fafc",
  muted: "rgba(226, 232, 240, 0.68)",
  cyan: "#82c1ff",
  amber: "#fbbf24",
};

export const panelSx = {
  border: `1px solid ${colors.border}`,
  backgroundColor: colors.surface,
  boxShadow: "0 18px 40px rgba(0,0,0,0.22)",
};

export const primaryButtonSx = {
  color: "#fff",
  textTransform: "none",
  borderRadius: "10px",
  fontWeight: 750,
  background: "linear-gradient(135deg, #4a90e2, #0077ff)",
  boxShadow: "none",
  "&:hover": {
    background: "linear-gradient(135deg, #5b9bea, #1684ff)",
    boxShadow: "none",
  },
};
