"use client";

// Renders history intervals with an explained access lock above the standard range.

import { useEffect, useRef, useState } from "react";
import { Box, ToggleButton, Tooltip, Typography } from "@mui/material";
import LockRounded from "@mui/icons-material/LockRounded";

const STANDARD_MAX_DAYS = 180;

export default function HistoryRangeSelector({
  value,
  onChange,
  options,
  hasExtendedAccess,
  translate,
  accentColor = "rgba(56,189,248,0.3)",
}) {
  const [openLockedOption, setOpenLockedOption] = useState(null);
  const closeTimerRef = useRef(null);

  useEffect(() => () => clearTimeout(closeTimerRef.current), []);

  const showLockedExplanation = (option) => {
    clearTimeout(closeTimerRef.current);
    setOpenLockedOption(option);
    closeTimerRef.current = setTimeout(() => setOpenLockedOption(null), 4500);
  };

  const handleChange = (nextValue) => {
    if (!nextValue) return;
    const locked = Number(nextValue) > STANDARD_MAX_DAYS && !hasExtendedAccess;
    if (locked) {
      showLockedExplanation(nextValue);
      return;
    }
    setOpenLockedOption(null);
    onChange?.(nextValue);
  };

  const tooltipContent = (
    <Box sx={{ maxWidth: 300, p: 0.35 }}>
      <Typography sx={{ color: "#f8fafc", fontSize: 12.5, fontWeight: 800 }}>
        {translate("Låst för Founders och Premium", "Locked for Founders and Premium")}
      </Typography>
      <Typography sx={{ color: "rgba(226,232,240,0.76)", fontSize: 11.5, lineHeight: 1.5, mt: 0.35 }}>
        {translate(
          "De är med och delar kostnaderna för EvoTrackers data, drift och fortsatta utveckling.",
          "They help share the cost of EvoTracker’s data, operations, and continued development."
        )}
      </Typography>
    </Box>
  );

  return (
    <Box
      role="group"
      aria-label={translate("Välj historikperiod", "Select history range")}
      sx={{
        width: "fit-content",
        maxWidth: "100%",
        display: "flex",
        alignItems: "center",
        p: 0.25,
        gap: 0.15,
        overflowX: "auto",
        borderRadius: "10px",
        border: "1px solid rgba(148,163,184,0.13)",
        backgroundColor: "rgba(30,41,59,0.66)",
      }}
    >
        {(options || []).map((option) => {
          const locked = Number(option) > STANDARD_MAX_DAYS && !hasExtendedAccess;
          const label = Number(option) === 365
            ? translate("1 år", "1 yr")
            : `${option} d`;
          const button = (
            <ToggleButton
              key={option}
              value={option}
              selected={Number(value) === Number(option)}
              aria-label={locked
                ? translate(`${label}, låst för Founders och Premium`, `${label}, locked for Founders and Premium`)
                : label}
              onClick={() => handleChange(option)}
              onMouseEnter={() => locked && showLockedExplanation(option)}
              sx={{
                minWidth: { xs: 44, sm: 49 },
                minHeight: 30,
                px: { xs: 0.75, sm: 1 },
                py: 0.35,
                gap: 0.4,
                textTransform: "none",
                color: locked ? "rgba(253,230,138,0.74)" : "rgba(226,232,240,0.76)",
                fontWeight: 720,
                fontSize: 12.5,
                whiteSpace: "nowrap",
                "&.Mui-selected": {
                  color: "#f8fafc",
                  backgroundColor: accentColor,
                },
                "&:hover": {
                  color: locked ? "#fde68a" : "#f8fafc",
                  backgroundColor: locked ? "rgba(245,158,11,0.08)" : "rgba(148,163,184,0.12)",
                },
              }}
            >
              {locked ? <LockRounded sx={{ fontSize: 12.5 }} /> : null}
              {label}
            </ToggleButton>
          );

          return locked ? (
            <Tooltip
              key={option}
              title={tooltipContent}
              arrow
              placement="top"
              open={openLockedOption === option}
              onOpen={() => showLockedExplanation(option)}
              onClose={() => setOpenLockedOption(null)}
              enterTouchDelay={0}
              leaveTouchDelay={4500}
              slotProps={{
                tooltip: {
                  sx: {
                    backgroundColor: "#172033",
                    border: "1px solid rgba(245,158,11,0.24)",
                    boxShadow: "0 16px 35px rgba(2,6,23,0.4)",
                  },
                },
                arrow: { sx: { color: "#172033" } },
              }}
            >
              {button}
            </Tooltip>
          ) : (
            button
          );
        })}
    </Box>
  );
}
