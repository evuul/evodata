export const cardBase = {
  background: "rgba(15,23,42,0.6)",
  borderRadius: "16px",
  border: "1px solid rgba(226,232,240,0.12)",
};

export const equalHeightCard = {
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
};

export const softCardBase = {
  background: "rgba(15,23,42,0.55)",
  borderRadius: "16px",
  border: "1px solid rgba(226,232,240,0.12)",
};

export const compactCard = {
  background: "rgba(15,23,42,0.6)",
  borderRadius: "14px",
  border: "1px solid rgba(226,232,240,0.12)",
};

export const gradientCards = {
  liveValue: "linear-gradient(135deg, rgba(30,58,138,0.45), rgba(15,23,42,0.7))",
  costBasis: "linear-gradient(135deg, rgba(15,118,110,0.35), rgba(15,23,42,0.7))",
  valueChange: "linear-gradient(135deg, rgba(124,58,237,0.28), rgba(15,23,42,0.7))",
  dividend: "linear-gradient(135deg, rgba(16,185,129,0.25), rgba(15,23,42,0.7))",
};

export const text = {
  overline: "rgba(148,163,184,0.75)",
  body: "rgba(226,232,240,0.72)",
  soft: "rgba(226,232,240,0.85)",
  subtle: "rgba(226,232,240,0.75)",
  muted: "rgba(226,232,240,0.6)",
  faint: "rgba(226,232,240,0.7)",
  sectionLabel: "rgba(148,163,184,0.65)",
  heading: "#f8fafc",
};

export const chipColors = {
  blue: {
    backgroundColor: "rgba(56,189,248,0.18)",
    color: "#e2e8f0",
    border: "1px solid rgba(56,189,248,0.35)",
  },
  indigo: {
    backgroundColor: "rgba(99,102,241,0.18)",
    color: "#e2e8f0",
    border: "1px solid rgba(99,102,241,0.35)",
  },
  pink: {
    backgroundColor: "rgba(244,114,182,0.18)",
    color: "#e2e8f0",
    border: "1px solid rgba(244,114,182,0.35)",
  },
  green: {
    backgroundColor: "rgba(16,185,129,0.18)",
    color: "#e2e8f0",
    border: "1px solid rgba(16,185,129,0.35)",
  },
  greenStrong: {
    backgroundColor: "rgba(34,197,94,0.18)",
    color: "#e2e8f0",
    border: "1px solid rgba(34,197,94,0.35)",
  },
  gray: {
    backgroundColor: "rgba(148,163,184,0.18)",
    color: "#e2e8f0",
    border: "1px solid rgba(148,163,184,0.35)",
  },
};

export const statusColors = {
  positive: "#34d399",
  negative: "#f87171",
  warning: "#fca5a5",
};

export const ownershipChipColors = {
  pre: {
    activeBg: "rgba(148,163,184,0.35)",
    inactiveBg: "rgba(148,163,184,0.2)",
    activeBorder: "1px solid rgba(226,232,240,0.5)",
    color: "#e2e8f0",
  },
  post: {
    activeBg: "rgba(34,197,94,0.35)",
    inactiveBg: "rgba(34,197,94,0.2)",
    activeBorder: "1px solid rgba(187,247,208,0.6)",
    color: "#bbf7d0",
  },
};
export const actionCard = {
  background: "rgba(15,23,42,0.6)",
  borderRadius: "16px",
  border: "1px solid rgba(226,232,240,0.12)",
  color: "#f8fafc",
  "& .MuiTypography-root": { color: "inherit" },
  "& .MuiInputBase-input": { color: "#f8fafc" },
  "& .MuiFormLabel-root": { color: "rgba(226,232,240,0.65)" },
};

export const pageShell = {
  background: "linear-gradient(135deg, rgba(15,23,42,0.95), rgba(17,28,47,0.98))",
  borderRadius: { xs: 2, md: 3 },
  border: "1px solid rgba(148,163,184,0.16)",
  boxShadow: "0 28px 60px rgba(15,23,42,0.55)",
};

export const sectionDivider = {
  borderColor: "rgba(148,163,184,0.18)",
};

export const liveDot = {
  width: 10,
  height: 10,
  borderRadius: "50%",
  background: statusColors.positive,
  boxShadow: "0 0 10px rgba(34,197,94,0.8)",
};

export const sectionHeader = {
  textTransform: "uppercase",
  letterSpacing: 1.4,
  fontSize: "0.75rem",
  fontWeight: 700,
  color: text.sectionLabel,
  display: "flex",
  alignItems: "center",
  gap: 1,
};

export const sectionRule = {
  height: "1px",
  flex: 1,
  background: "rgba(148,163,184,0.12)",
};

export const inputSx = {
  "& .MuiInputBase-input": { color: "#f8fafc" },
  "& input": { color: "#f8fafc" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(226,232,240,0.2)" },
  "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(226,232,240,0.35)" },
  "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(56,189,248,0.8)" },
};

export const inputLabelSx = { color: "rgba(226,232,240,0.65)" };

export const buttonStyles = {
  primary: { fontWeight: 700, background: "linear-gradient(135deg, #38bdf8, #3b82f6)" },
  reset: { color: statusColors.warning, fontWeight: 600 },
  outlineDanger: {
    borderColor: "rgba(248,113,113,0.5)",
    color: "#fecaca",
    "&:hover": { borderColor: "rgba(248,113,113,0.8)", backgroundColor: "rgba(248,113,113,0.08)" },
  },
};

export const activityRow = {
  background: "rgba(15,23,42,0.45)",
  borderRadius: "10px",
  border: "1px solid rgba(148,163,184,0.2)",
  px: 1.5,
  py: 1,
};

export const modalPaper = {
  background: "rgba(15,23,42,0.95)",
  border: "1px solid rgba(148,163,184,0.2)",
};
