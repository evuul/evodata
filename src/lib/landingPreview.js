// Defines the public landing-page teaser while keeping subscriber metrics masked.

const COPY = {
  sv: {
    disclosure: "Förhandsvisningen innehåller illustrativa värden. Korrekta data visas efter inloggning.",
    metrics: [
      { id: "players", label: "Live-spelare", value: "68 420", unit: "spelare", status: "live" },
      { id: "trend", label: "Lobbytrend", value: "+4,8", unit: "%", status: "live" },
      { id: "forecast", label: "Kvartalsforecast", value: "512,4", unit: "MEUR", status: "model" },
    ],
    features: [
      { id: "lobby", title: "Följ lobbyn live", description: "Se totalt antal spelare, dagens topp och vilka spel som driver aktiviteten just nu.", detail: "Live-spel, ranking och toppnoteringar" },
      { id: "trends", title: "Se trenden över tid", description: "Jämför 7, 30 och 90 dagar med tydliga grafer, glidande medelvärden och spel-för-spel-analys.", detail: "Lobby-, spel- och Asien-trender" },
      { id: "forecast", title: "Koppla data till kvartalet", description: "Få en modellbaserad intäktsforecast som kombinerar spelaraktivitet med rapporterad historik.", detail: "Estimat, rapporter och marginaler" },
    ],
  },
  en: {
    disclosure: "The preview contains illustrative values. Accurate data is available after sign-in.",
    metrics: [
      { id: "players", label: "Live players", value: "68,420", unit: "players", status: "live" },
      { id: "trend", label: "Lobby trend", value: "+4.8", unit: "%", status: "live" },
      { id: "forecast", label: "Quarter forecast", value: "512.4", unit: "MEUR", status: "model" },
    ],
    features: [
      { id: "lobby", title: "Follow the lobby live", description: "See total players, today's peak and which games are driving activity right now.", detail: "Live games, ranking and all-time highs" },
      { id: "trends", title: "See the trend over time", description: "Compare 7, 30 and 90 days with clear charts, moving averages and game-by-game analysis.", detail: "Lobby, game and Asia trends" },
      { id: "forecast", title: "Connect data to the quarter", description: "Get a model-based revenue forecast combining player activity with reported history.", detail: "Estimates, reports and margins" },
    ],
  },
};

const maskMetric = (metric) => ({ ...metric, value: metric.value.replace(/[0-9]/g, "•") });

export function buildLandingPreviewModel(locale) {
  const selected = COPY[locale] ?? COPY.sv;
  return {
    disclosure: selected.disclosure,
    metrics: selected.metrics.map(maskMetric),
    features: selected.features.map((feature) => ({ ...feature })),
  };
}
