"use client";

// Top navigation row, account controls, and support actions for the live header.

import React from "react";
import {
  Box,
  Button,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Stack,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import LocalCafeRounded from "@mui/icons-material/LocalCafeRounded";
import CloseRounded from "@mui/icons-material/CloseRounded";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import PersonRounded from "@mui/icons-material/PersonRounded";
import ExpandMoreRounded from "@mui/icons-material/ExpandMoreRounded";
import LogoutRounded from "@mui/icons-material/LogoutRounded";
import NextLink from "next/link";
import { LOCALE_OPTIONS } from "@/context/LocaleContext";

export default function LiveHeaderTopBar({
  translate,
  isMobileMenu,
  venueChipLabel,
  venueChipLabelMobile,
  marketDotColor,
  blankningChipLabel,
  blankningChipLabelMobile,
  lobbyAthLabel,
  showDonationNudge,
  donationNudgeText,
  donationNudgeClickLabel,
  handleDismissDonationNudge,
  supportUrl,
  isAuthenticated,
  userNameLabel,
  isUserMenuOpen,
  userMenuAnchor,
  setUserMenuAnchor,
  handleLogout,
  locale,
  setLocale,
  showMyPageNewBadge,
}) {
  const supportChipLabel = isMobileMenu
    ? translate("Stötta", "Support")
    : translate("Stötta sidan", "Support the site");

  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexDirection: { xs: "row", md: "row" },
        gap: { xs: 1.5, md: 2.5 },
        flexWrap: "nowrap",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: { xs: 0.8, lg: 0.6 },
          minWidth: 0,
          flex: { xs: "1 1 100%", lg: 1 },
          pr: { xs: 0, md: 1 },
          order: { xs: 1, lg: 1 },
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1,
            flexWrap: { xs: "wrap", lg: "nowrap" },
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: { xs: 0.6, sm: 1 },
              minWidth: 0,
              flex: "1 1 auto",
              flexWrap: "nowrap",
              "& .MuiChip-root": { flexShrink: 0 },
            }}
          >
            <Chip
              size="small"
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                  <Typography
                    component="span"
                    sx={{
                      fontSize: { xs: "0.62rem", sm: "0.8rem" },
                      color: "inherit",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isMobileMenu ? venueChipLabelMobile : venueChipLabel}
                  </Typography>
                  <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: marketDotColor }} />
                </Box>
              }
              sx={{
                backgroundColor: "rgba(15,23,42,0.55)",
                color: "#cbd5f5",
                borderRadius: "999px",
                height: { xs: 22, sm: 28 },
                "& .MuiChip-label": { px: { xs: 0.65, sm: 1.2 }, display: "flex" },
              }}
            />

            {isMobileMenu ? (
              <Chip
                component={NextLink}
                href="/?panel=short"
                clickable
                size="small"
                label={blankningChipLabelMobile}
                sx={{
                  flex: "0 0 auto",
                  width: "fit-content",
                  flexShrink: 0,
                  backgroundColor: "rgba(250,204,21,0.14)",
                  color: "#facc15",
                  borderRadius: "999px",
                  border: "1px solid rgba(250,204,21,0.28)",
                  height: 22,
                  "& .MuiChip-label": {
                    px: 0.55,
                    fontSize: "0.58rem",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                  },
                }}
              />
            ) : null}

            {!isMobileMenu && (
              <>
                <Chip
                  component={NextLink}
                  href="/?panel=short"
                  clickable
                  size="small"
                  label={blankningChipLabel}
                  sx={{
                    backgroundColor: "rgba(250,204,21,0.18)",
                    color: "#facc15",
                    borderRadius: "999px",
                    border: "1px solid rgba(250,204,21,0.35)",
                    height: { xs: 22, sm: 28 },
                    "& .MuiChip-label": {
                      px: { xs: 0.7, sm: 1.2 },
                      fontSize: { xs: "0.64rem", sm: "0.8rem" },
                    },
                  }}
                />
                {lobbyAthLabel ? (
                  <Chip
                    size="small"
                    label={lobbyAthLabel}
                    sx={{
                      backgroundColor: "rgba(52,211,153,0.18)",
                      color: "#34d399",
                      borderRadius: "999px",
                      border: "1px solid rgba(52,211,153,0.35)",
                      height: { xs: 22, sm: 28 },
                      "& .MuiChip-label": {
                        px: { xs: 0.7, sm: 1.2 },
                        fontSize: { xs: "0.64rem", sm: "0.8rem" },
                        fontWeight: 600,
                      },
                    }}
                  />
                ) : null}
                <Chip
                  component={NextLink}
                  href="/disclaimer"
                  clickable
                  size="small"
                  icon={<InfoOutlined />}
                  label={translate("Disclaimer", "Disclaimer")}
                  sx={{
                    backgroundColor: "rgba(56,189,248,0.14)",
                    color: "#7dd3fc",
                    borderRadius: "999px",
                    border: "1px solid rgba(56,189,248,0.3)",
                    height: { xs: 22, sm: 28 },
                    "& .MuiChip-label": {
                      px: { xs: 0.6, sm: 1.0 },
                      fontSize: { xs: "0.62rem", sm: "0.76rem" },
                      fontWeight: 700,
                    },
                    "& .MuiChip-icon": { color: "#7dd3fc", fontSize: "1rem" },
                  }}
                />
                <Box
                  sx={{
                    position: "relative",
                    display: { xs: "none", md: "flex" },
                    alignItems: "center",
                  }}
                >
                  {showDonationNudge ? (
                    <Box
                      component="a"
                      href={supportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      sx={{
                        position: "absolute",
                        top: "calc(100% + 12px)",
                        left: -8,
                        right: "auto",
                        display: "flex",
                        background: "rgba(8,15,30,0.95)",
                        border: "1px solid rgba(56,189,248,0.32)",
                        borderRadius: "14px",
                        boxShadow: "0 20px 55px rgba(8,47,73,0.45)",
                        px: 1.3,
                        py: 1.15,
                        maxWidth: 260,
                        minWidth: 210,
                        zIndex: 5,
                        flexDirection: "column",
                        gap: 0.6,
                        backdropFilter: "blur(12px)",
                        transform: "translateX(-2px)",
                        cursor: "pointer",
                        textDecoration: "none",
                        "@keyframes nudgeFloat": {
                          "0%": { transform: "translateY(0px)" },
                          "50%": { transform: "translateY(-3px)" },
                          "100%": { transform: "translateY(0px)" },
                        },
                        "@keyframes arrowBounce": {
                          "0%": { transform: "translate(0, 0)" },
                          "50%": { transform: "translate(2px, -2px)" },
                          "100%": { transform: "translate(0, 0)" },
                        },
                        animation: "nudgeFloat 6s ease-in-out infinite",
                      }}
                    >
                      <Typography variant="caption" sx={{ color: "#e2e8f0", lineHeight: 1.6, fontWeight: 500 }}>
                        {donationNudgeText}
                      </Typography>
                      <Stack direction="row" spacing={1} alignItems="center" justifyContent="space-between">
                        <Stack direction="row" spacing={0.6} alignItems="center">
                          <Box
                            component="span"
                            sx={{
                              fontSize: "1rem",
                              color: "#f9a8d4",
                              animation: "arrowBounce 1.8s ease-in-out infinite",
                            }}
                          >
                            ↗
                          </Box>
                          <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.8)", fontWeight: 600 }}>
                            {donationNudgeClickLabel}
                          </Typography>
                        </Stack>
                        <IconButton
                          size="small"
                          onClick={(event) => {
                            event.preventDefault();
                            event.stopPropagation();
                            handleDismissDonationNudge();
                          }}
                          sx={{
                            color: "rgba(226,232,240,0.7)",
                            "&:hover": { color: "#f8fafc" },
                          }}
                        >
                          <CloseRounded fontSize="small" />
                        </IconButton>
                      </Stack>
                      <Box
                        sx={{
                          position: "absolute",
                          top: -7,
                          left: 32,
                          width: 16,
                          height: 16,
                          transform: "rotate(45deg)",
                          background: "rgba(8,15,30,0.95)",
                          border: "1px solid rgba(56,189,248,0.32)",
                        }}
                      />
                    </Box>
                  ) : null}

                  <Chip
                    component="a"
                    href={supportUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    clickable
                    size="small"
                    icon={<LocalCafeRounded sx={{ color: "#f9a8d4" }} />}
                    label={translate("Stötta sidan", "Support the site")}
                    sx={{
                      background: "linear-gradient(135deg, rgba(236,72,153,0.15), rgba(14,165,233,0.15))",
                      color: "#f8fafc",
                      borderRadius: "999px",
                      border: "1px solid rgba(236,72,153,0.35)",
                      transition: "transform 120ms ease",
                      height: { xs: 24, sm: 28 },
                      "& .MuiChip-label": {
                        px: { xs: 1, sm: 1.2 },
                        fontSize: { xs: "0.72rem", sm: "0.8rem" },
                      },
                      "& .MuiChip-icon": { fontSize: "1rem" },
                      "&:hover": {
                        transform: "translateY(-1px)",
                        background: "linear-gradient(135deg, rgba(236,72,153,0.25), rgba(14,165,233,0.25))",
                      },
                    }}
                  />
                </Box>
              </>
            )}
          </Box>

          <Stack
            direction="row"
            spacing={{ xs: 0.6, sm: 1 }}
            alignItems="center"
            justifyContent="flex-end"
            flexWrap="nowrap"
            sx={{ ml: "auto", flexShrink: 0 }}
          >
            <ToggleButtonGroup
              exclusive
              size="small"
              value={locale}
              onChange={(_, value) => value && setLocale(value)}
              sx={{
                backgroundColor: "rgba(15,23,42,0.55)",
                borderRadius: "999px",
                p: 0.25,
                border: "1px solid rgba(148,163,184,0.2)",
                backdropFilter: "blur(8px)",
              }}
            >
              {LOCALE_OPTIONS.map((option) => (
                <ToggleButton
                  key={option.value}
                  value={option.value}
                  sx={{
                    textTransform: "none",
                    border: 0,
                    borderRadius: "999px!important",
                    color: "rgba(226,232,240,0.75)",
                    fontSize: { xs: "0.6rem", sm: "0.78rem" },
                    minHeight: 26,
                    px: 1,
                    "&.Mui-selected": {
                      color: "#0f172a",
                      backgroundColor: "#f8fafc",
                      fontWeight: 800,
                    },
                  }}
                >
                  {option.label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>

            {isAuthenticated && userNameLabel ? (
              <>
                <Button
                  size="small"
                  onClick={(event) => setUserMenuAnchor(event.currentTarget)}
                  endIcon={<ExpandMoreRounded />}
                  sx={{
                    textTransform: "none",
                    color: "#e2e8f0",
                    background: "rgba(15,23,42,0.55)",
                    borderRadius: "999px",
                    border: "1px solid rgba(148,163,184,0.22)",
                    backdropFilter: "blur(10px)",
                    px: { xs: 1, sm: 1.4 },
                    py: 0.45,
                    fontSize: { xs: "0.65rem", sm: "0.82rem" },
                    fontWeight: 700,
                    "&:hover": {
                      background: "rgba(30,41,59,0.7)",
                      borderColor: "rgba(148,163,184,0.45)",
                    },
                  }}
                  startIcon={<PersonRounded sx={{ fontSize: 18 }} />}
                >
                  {userNameLabel}
                </Button>
                <Menu
                  anchorEl={userMenuAnchor}
                  open={isUserMenuOpen}
                  onClose={() => setUserMenuAnchor(null)}
                  anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
                  transformOrigin={{ vertical: "top", horizontal: "right" }}
                  PaperProps={{
                    sx: {
                      mt: 1,
                      minWidth: 200,
                      background: "rgba(15,23,42,0.95)",
                      border: "1px solid rgba(148,163,184,0.2)",
                      borderRadius: 2,
                      color: "#e2e8f0",
                      backdropFilter: "blur(10px)",
                    },
                  }}
                >
                  <MenuItem
                    component={NextLink}
                    href="/mina-sidor"
                    onClick={() => setUserMenuAnchor(null)}
                    sx={{ gap: 1 }}
                  >
                    <ListItemText
                      primary={
                        <Stack direction="row" spacing={1} alignItems="center">
                          <Box component="span">{translate("Min sida", "My page")}</Box>
                          {showMyPageNewBadge ? (
                            <Box
                              component="span"
                              sx={{
                                px: 0.7,
                                py: 0.12,
                                borderRadius: "999px",
                                fontSize: "0.6rem",
                                fontWeight: 800,
                                letterSpacing: 0.5,
                                lineHeight: 1.35,
                                color: "#fef9c3",
                                background: "linear-gradient(135deg, rgba(245,158,11,0.3), rgba(251,191,36,0.4))",
                                border: "1px solid rgba(251,191,36,0.45)",
                              }}
                            >
                              {translate("NY", "NEW")}
                            </Box>
                          ) : null}
                        </Stack>
                      }
                    />
                  </MenuItem>
                  <Divider sx={{ borderColor: "rgba(148,163,184,0.18)" }} />
                  <MenuItem
                    onClick={() => {
                      setUserMenuAnchor(null);
                      handleLogout();
                    }}
                    sx={{ gap: 1 }}
                  >
                    <ListItemIcon sx={{ minWidth: 32, color: "#fca5a5" }}>
                      <LogoutRounded fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary={translate("Logga ut", "Log out")} />
                  </MenuItem>
                </Menu>
              </>
            ) : null}
          </Stack>
        </Box>

        {isMobileMenu ? (
          <Box
            sx={{
              display: "flex",
              flexDirection: "row",
              gap: 0.5,
              width: "100%",
              mt: 0.6,
              alignItems: "center",
              flexWrap: "nowrap",
            }}
          >
            <Chip
              component="a"
              href={supportUrl}
              target="_blank"
              rel="noopener noreferrer"
              clickable
              size="small"
              icon={null}
              label={supportChipLabel}
              sx={{
                flex: "1 1 0",
                minWidth: 0,
                background: "rgba(8,15,30,0.9)",
                color: "#f8fafc",
                borderRadius: "999px",
                border: "1px solid rgba(236,72,153,0.28)",
                boxShadow: "0 12px 28px rgba(0,0,0,0.26)",
                height: 22,
                "& .MuiChip-label": {
                  px: 0.55,
                  fontSize: "0.56rem",
                  fontWeight: 800,
                  letterSpacing: 0.15,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                },
                "&:hover": {
                  boxShadow: "0 14px 32px rgba(0,0,0,0.42)",
                  background: "rgba(8,15,30,0.96)",
                },
              }}
            />
            <Chip
              component={NextLink}
              href="/disclaimer"
              clickable
              size="small"
              label={translate("Disclaimer", "Disclaimer")}
              sx={{
                flex: "0 0 auto",
                backgroundColor: "rgba(56,189,248,0.12)",
                color: "#7dd3fc",
                borderRadius: "999px",
                border: "1px solid rgba(56,189,248,0.22)",
                height: 22,
                "& .MuiChip-label": { px: 0.55, fontSize: "0.56rem", fontWeight: 900 },
              }}
            />
          </Box>
        ) : null}
      </Box>
    </Box>
  );
}
