"use client";

// Saves panel shortcuts in this browser without storing account or portfolio data.

import { useEffect, useMemo, useState } from "react";
import { Box, Button } from "@mui/material";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";
import { useTranslate } from "@/context/LocaleContext";
import { readStoredJson, writeStoredJson } from "@/lib/clientStorage";
import { FAVORITES_STORAGE_KEY, normalizeFavoritePanels, toggleFavoritePanel } from "@/lib/dashboardFavorites";

export default function DashboardFavorites({ activePanel, panelGroups, onPanelChange }) {
  const translate = useTranslate();
  const options = useMemo(() => panelGroups.flatMap((group) => group.options), [panelGroups]);
  const values = useMemo(() => options.map((option) => option.value), [options]);
  const [favorites, setFavorites] = useState([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setFavorites(normalizeFavoritePanels(readStoredJson(FAVORITES_STORAGE_KEY, []), values));
    setReady(true);
  }, [values]);

  useEffect(() => {
    if (ready) writeStoredJson(FAVORITES_STORAGE_KEY, favorites);
  }, [favorites, ready]);

  const selected = favorites.includes(activePanel);
  const currentLabel = options.find((option) => option.value === activePanel)?.label;
  if (!currentLabel) return null;

  return (
    <Box component="nav" aria-label={translate("Favoritvyer", "Favourite views")} sx={{ display: "flex", justifyContent: "center", alignItems: "center", flexWrap: "wrap", gap: 0.75, mb: 1.5 }}>
      <Button
        type="button"
        aria-pressed={selected}
        aria-label={translate(`${selected ? "Ta bort" : "Spara"} ${currentLabel} ${selected ? "från" : "som"} favorit`, `${selected ? "Remove" : "Save"} ${currentLabel} ${selected ? "from" : "as"} favourites`)}
        onClick={() => setFavorites((current) => toggleFavoritePanel(current, activePanel, values))}
        startIcon={selected ? <StarRoundedIcon /> : <StarBorderRoundedIcon />}
        sx={{ color: selected ? "#fde68a" : "#cbd5e1", textTransform: "none", minHeight: 44 }}
      >
        {selected ? translate("Sparad favorit", "Saved favourite") : translate("Spara favorit", "Save favourite")}
      </Button>
      {favorites.map((value) => (
        <Button key={value} type="button" aria-current={value === activePanel ? "page" : undefined} onClick={(event) => onPanelChange(event, value)} sx={{ color: "#e2e8f0", border: "1px solid rgba(148,163,184,0.25)", borderRadius: 3, textTransform: "none", minHeight: 44 }}>
          {options.find((option) => option.value === value)?.label}
        </Button>
      ))}
    </Box>
  );
}
