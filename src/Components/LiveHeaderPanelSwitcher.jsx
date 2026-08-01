"use client";

// Panel selector and content wrapper for the live header dashboard area.

import React, { useState } from "react";
import { Box, FormControl, IconButton, ListSubheader, MenuItem, Select, Snackbar, Stack, ToggleButton, ToggleButtonGroup, Tooltip, Typography } from "@mui/material";
import ShareRounded from "@mui/icons-material/ShareRounded";

export default function LiveHeaderPanelSwitcher({
  activePanel,
  isMobileMenu,
  panelGroups,
  handlePanelChange,
  panelContent,
  isLiveMoneyPanel,
  isLivePanel,
}) {
  const [shareNotice, setShareNotice] = useState(false);
  const activeLabel = panelGroups.flatMap((group) => group.options).find((option) => option.value === activePanel)?.label ?? activePanel;

  const handleShare = async () => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (activePanel === "live") url.searchParams.delete("panel");
    else url.searchParams.set("panel", activePanel);
    const shareUrl = url.toString();
    try {
      if (navigator.share) {
        await navigator.share({ title: `EvoTracker · ${activeLabel}`, url: shareUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareUrl);
        setShareNotice(true);
      }
    } catch {
      // Sharing can be cancelled by the user; no error state is needed.
    }
  };

  return (
    <>
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 0.8, width: "100%" }}>
        {isMobileMenu ? (
          <FormControl fullWidth size="small" sx={{ maxWidth: 260 }}>
            <Select
              value={activePanel}
              onChange={(event) => handlePanelChange(event, event.target.value)}
              renderValue={(value) =>
                panelGroups.flatMap((group) => group.options).find((option) => option.value === value)?.label ?? value
              }
              sx={{
                borderRadius: "999px",
                color: "#f8fafc",
                backgroundColor: "rgba(148,163,184,0.12)",
                border: "1px solid rgba(148,163,184,0.2)",
                "& .MuiSelect-select": { py: 1.1, pl: 2.2 },
              }}
              MenuProps={{
                PaperProps: {
                  sx: { color: "#f8fafc", backgroundColor: "#111c2f" },
                },
              }}
            >
              {panelGroups.flatMap((group) => [
                <ListSubheader key={`${group.id}-header`} sx={{ lineHeight: "32px", fontSize: "0.72rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, color: "rgba(148,163,184,0.82)", backgroundColor: "#111c2f" }}>
                  {group.label}
                </ListSubheader>,
                ...group.options.map((option) => (
                  <MenuItem key={option.value} value={option.value} sx={{ color: "#f8fafc" }}>{option.label}</MenuItem>
                )),
              ])}
            </Select>
          </FormControl>
        ) : (
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              alignItems: "flex-end",
              justifyContent: "center",
              gap: 1,
              maxWidth: "100%",
            }}
          >
            {panelGroups.map((group) => (
              <Stack key={group.id} spacing={0.35} alignItems="flex-start">
                <Typography variant="caption" sx={{ pl: 1.1, color: "rgba(148,163,184,0.72)", fontWeight: 800, textTransform: "uppercase", letterSpacing: 0.8, fontSize: "0.64rem" }}>
                  {group.label}
                </Typography>
                <ToggleButtonGroup value={activePanel} exclusive onChange={handlePanelChange} sx={{ backgroundColor: "rgba(15,23,42,0.55)", borderRadius: "999px", p: 0.35, gap: 0.35 }}>
                  {group.options.map((option) => (
                    <ToggleButton
                      key={option.value}
                      value={option.value}
                      sx={{
                        textTransform: "none",
                        color: "rgba(226,232,240,0.78)",
                        border: 0,
                        borderRadius: "999px!important",
                        px: { sm: 1.3, lg: 1.6 },
                        py: 0.5,
                        fontSize: { sm: "0.76rem", lg: "0.82rem" },
                        whiteSpace: "nowrap",
                        backgroundColor: "rgba(148,163,184,0.08)",
                        "&:hover": { backgroundColor: "rgba(148,163,184,0.18)" },
                        "&.Mui-selected": {
                          color: "#f8fafc",
                          backgroundColor: option.value === "buybacks" ? "rgba(134,239,172,0.25)" : option.value === "short" ? "rgba(248,113,113,0.25)" : "rgba(56,189,248,0.28)",
                        },
                      }}
                    >
                      {option.label}
                    </ToggleButton>
                  ))}
                </ToggleButtonGroup>
              </Stack>
            ))}
          </Box>
        )}
        <Tooltip title={activePanel === "live" ? "Share EvoTracker" : `Share ${activeLabel}`}>
          <IconButton
            onClick={handleShare}
            aria-label={activePanel === "live" ? "Share EvoTracker" : `Share ${activeLabel}`}
            size="small"
            sx={{ color: "#7dd3fc", border: "1px solid rgba(125,211,252,0.35)", backgroundColor: "rgba(56,189,248,0.1)", "&:hover": { backgroundColor: "rgba(56,189,248,0.2)" } }}
          >
            <ShareRounded fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      <Snackbar open={shareNotice} autoHideDuration={2200} onClose={() => setShareNotice(false)} message="Link copied" />

      <Box
        sx={{
          width: "100%",
          mt: { xs: 1, sm: 1.5 },
          mx: isLiveMoneyPanel ? "auto" : isLivePanel ? "auto" : { xs: 0, sm: -5, md: -6 },
          maxWidth: isLiveMoneyPanel ? "min(1700px, 100%)" : isLivePanel ? "100%" : "none",
          boxSizing: "border-box",
          overflowX: "hidden",
          display: isLiveMoneyPanel || isLivePanel ? "flex" : "block",
          justifyContent: isLiveMoneyPanel || isLivePanel ? "center" : "flex-start",
          "& > *": {
            background: "transparent!important",
            border: "none!important",
            boxShadow: "none!important",
          },
        }}
      >
        {panelContent}
      </Box>
    </>
  );
}
