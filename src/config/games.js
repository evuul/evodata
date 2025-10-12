// src/config/games.js

/**
 * Gemensam källsanning för alla spel.
 * id = unikt nyckelvärde för visning/graf/lagring (kan innehålla ":a")
 * apiSlug = slug för /api/casinoscores/players/[slug]
 * apiVariant = "a" endast för Crazy Time A (övriga saknar variant)
 */
export const GAMES = [
  { id: "crazy-time",                  label: "Crazy Time",              apiSlug: "crazy-time" },
  { id: "crazy-time:a",                label: "Crazy Time A",            apiSlug: "crazy-time", apiVariant: "a" },
  { id: "monopoly-big-baller",         label: "Monopoly Big Baller",     apiSlug: "monopoly-big-baller" },
  { id: "funky-time",                  label: "Funky Time",              apiSlug: "funky-time" },
  { id: "lightning-storm",             label: "Lightning Storm",         apiSlug: "lightning-storm" },
  { id: "crazy-balls",                 label: "Crazy Balls",             apiSlug: "crazy-balls" },
  { id: "ice-fishing",                 label: "Ice Fishing",             apiSlug: "ice-fishing" },
  { id: "xxxtreme-lightning-roulette", label: "XXXtreme Lightning Roulette", apiSlug: "xxxtreme-lightning-roulette" },
  { id: "monopoly-live",               label: "Monopoly Live",           apiSlug: "monopoly-live" },
  { id: "red-door-roulette",           label: "Red Door Roulette",       apiSlug: "red-door-roulette" },
  { id: "auto-roulette",               label: "Auto Roulette",           apiSlug: "auto-roulette" },
  { id: "speed-baccarat-a",            label: "Speed Baccarat A",        apiSlug: "speed-baccarat-a" },
  { id: "super-andar-bahar",           label: "Super Andar Bahar",       apiSlug: "super-andar-bahar" },
  { id: "lightning-dice",              label: "Lightning Dice",          apiSlug: "lightning-dice" },
  { id: "lightning-roulette",          label: "Lightning Roulette",      apiSlug: "lightning-roulette" },
  { id: "bac-bo",                      label: "Bac Bo",                  apiSlug: "bac-bo" },

  // 🔥 Nya Evolution-spel från lobby-API:t
  { id: "lightning-baccarat",          label: "Lightning Baccarat",      apiSlug: "lightning-baccarat" },
  { id: "immersive-roulette",          label: "Immersive Roulette",      apiSlug: "immersive-roulette" },
  { id: "cash-or-crash-live",          label: "Cash or Crash Live",      apiSlug: "cash-or-crash-live" },
  { id: "fan-tan-live",                label: "Fan Tan Live",            apiSlug: "fan-tan-live" },
  { id: "mega-ball",                   label: "Mega Ball",               apiSlug: "mega-ball" },
  { id: "free-bet-blackjack",          label: "Free Bet Blackjack",      apiSlug: "free-bet-blackjack" },
  { id: "dream-catcher",               label: "Dream Catcher",           apiSlug: "dream-catcher" },
  { id: "dead-or-alive-saloon",        label: "Dead or Alive Saloon",    apiSlug: "dead-or-alive-saloon" },
  { id: "lightning-bac-bo",            label: "Lightning Bac Bo",        apiSlug: "lightning-bac-bo" },
  { id: "super-sic-bo",                label: "Super Sic Bo",            apiSlug: "super-sic-bo" },
  { id: "fortune-roulette",            label: "Fortune Roulette",        apiSlug: "fortune-roulette" },
];

/**
 * Delad färgpalett (används i header, listor, grafer)
 * unika färger per id
 */
export const COLORS = {
  "crazy-time": "#C21807",              // Rubinröd
  "crazy-time:a": "#26A69A",            // Teal (A-varianten)
  "monopoly-big-baller": "#00E676",
  "funky-time": "#BA68C8",
  "lightning-storm": "#1976D2",         // Stark blå
  "crazy-balls": "#E57373",             // Ljusare röd
  "ice-fishing": "#AB47BC",
  "xxxtreme-lightning-roulette": "#FF7043",
  "monopoly-live": "#66BB6A",
  "red-door-roulette": "#EC407A",
  "auto-roulette": "#26C6DA",
  "speed-baccarat-a": "#4DB6AC",
  "super-andar-bahar": "#F06292",
  "lightning-dice": "#FFD54F",
  "lightning-roulette": "#29B6F6",
  "bac-bo": "#FF8A65",

  // 🎨 Nya färger för nya spel
  "lightning-baccarat": "#FFB300",
  "immersive-roulette": "#42A5F5",
  "cash-or-crash-live": "#FF5252",
  "fan-tan-live": "#F48FB1",
  "mega-ball": "#4FC3F7",
  "free-bet-blackjack": "#A5D6A7",
  "dream-catcher": "#9575CD",
  "dead-or-alive-saloon": "#8D6E63",
  "lightning-bac-bo": "#CE93D8",
  "super-sic-bo": "#FDD835",
  "fortune-roulette": "#81C784",
};

/** Hur många som räknas som “Top N” i listor/header */
export const TOP_N = 3;

/** Hjälpfunktion om du vill slå upp färg tryggt */
export const getGameColor = (id) => COLORS[id] || "#ffffff";
