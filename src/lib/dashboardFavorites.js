// Validates locally saved dashboard favourites against the available panels.

export const FAVORITES_STORAGE_KEY = "evotracker:favorite-panels:v1";

export function normalizeFavoritePanels(value, panelValues) {
  if (!Array.isArray(value)) return [];
  const allowed = new Set(panelValues);
  return [...new Set(value.filter((panel) => typeof panel === "string" && allowed.has(panel)))];
}

export function toggleFavoritePanel(current, panel, panelValues) {
  const normalized = normalizeFavoritePanels(current, panelValues);
  if (!panelValues.includes(panel)) return normalized;
  return normalized.includes(panel) ? normalized.filter((value) => value !== panel) : [...normalized, panel];
}
