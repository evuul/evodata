"use client";

// Provides responsive navigation between the main Mina sidor sections.

import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";

const USER_ITEMS = [
  { value: "oversikt", sv: "Översikt", en: "Overview" },
  { value: "transaktioner", sv: "Transaktioner", en: "Transactions" },
  { value: "utdelning", sv: "Utdelning", en: "Dividends" },
  { value: "agande", sv: "Ägande", en: "Ownership" },
  { value: "verktyg", sv: "Verktyg", en: "Tools" },
];

export default function MinaSidorSectionNav({ activeView, isAdmin, onChange, translate }) {
  const items = isAdmin ? [...USER_ITEMS, { value: "admin", sv: "Admin", en: "Admin" }] : USER_ITEMS;

  return (
    <Box
      component="nav"
      aria-label={translate("Sektioner på Mina sidor", "My pages sections")}
      sx={{
        position: "sticky",
        top: 8,
        zIndex: 20,
        width: "100%",
        overflowX: "auto",
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
      }}
    >
      <ToggleButtonGroup
        value={activeView}
        exclusive
        onChange={(_, value) => value && onChange(value)}
        size="small"
        sx={{
          display: "flex",
          width: "max-content",
          minWidth: { md: "100%" },
          p: 0.65,
          borderRadius: "16px",
          border: "1px solid rgba(148,163,184,0.2)",
          background: "rgba(10,18,34,0.88)",
          backdropFilter: "blur(16px)",
          boxShadow: "none",
          "& .MuiToggleButtonGroup-grouped": {
            flex: { md: 1 },
            minWidth: { xs: 112, md: 0 },
            border: 0,
            borderRadius: "12px!important",
            px: 2,
            py: 0.9,
            color: "rgba(226,232,240,0.68)",
            fontWeight: 750,
            textTransform: "none",
            whiteSpace: "nowrap",
            "&.Mui-selected": {
              color: "#f8fafc",
              background: "rgba(30,64,175,0.36)",
              boxShadow: "inset 0 0 0 1px rgba(125,211,252,0.24)",
            },
            "&.Mui-selected:hover": {
              background: "rgba(30,64,175,0.48)",
            },
          },
        }}
      >
        {items.map((item) => (
          <ToggleButton key={item.value} value={item.value} aria-label={translate(item.sv, item.en)}>
            {translate(item.sv, item.en)}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
}
