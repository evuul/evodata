// Defines the static datasets required by each dashboard panel.

const PANEL_DATA_KEYS = Object.freeze({
  financial: ["financialReports", "dividendData"],
  gameshow: ["financialReports", "averagePlayersData"],
  fairvalue: ["financialReports", "buybackData", "sharesData"],
  report: ["financialReports"],
  buybacks: ["financialReports", "dividendData"],
});

const CASH_DATA_KEYS = Object.freeze({
  cash: ["financialReports"],
  allocation: ["financialReports", "dividendData", "buybackData", "sharesData"],
});

export function getDashboardPanelDataKeys(activePanel, cashView = "cash") {
  if (activePanel === "cash") return CASH_DATA_KEYS[cashView] ?? CASH_DATA_KEYS.cash;
  return PANEL_DATA_KEYS[activePanel] ?? [];
}
