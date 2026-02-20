// src/config/games.js

/**
 * Gemensam källsanning för alla spel.
 * id = unikt nyckelvärde för visning/graf/lagring (kan innehålla ":a")
 * apiSlug = slug för /api/casinoscores/players/[slug]
 * apiVariant = "a" endast för Crazy Time A (övriga saknar variant)
 */
const ALL_GAMES = [
  { id: "crazy-time", label: "Crazy Time", apiSlug: "crazy-time" },
  { id: "crazy-time:a", label: "Crazy Time A", apiSlug: "crazy-time", apiVariant: "a" },
  { id: "monopoly-live", label: "Monopoly Live", apiSlug: "monopoly-live" },
  { id: "monopoly-big-baller", label: "Big Baller", apiSlug: "monopoly-big-baller" },
  { id: "funky-time", label: "Funky Time", apiSlug: "funky-time" },
  { id: "lightning-roulette", label: "Lightning Roulette", apiSlug: "lightning-roulette" },
  { id: "lightning-baccarat", label: "Lightning Baccarat", apiSlug: "lightning-baccarat" },
  { id: "xxxtreme-lightning-roulette", label: "XXXtreme Lightning Roulette", apiSlug: "xxxtreme-lightning-roulette" },
  { id: "immersive-roulette", label: "Immersive Roulette", apiSlug: "immersive-roulette" },
  // Tillfälligt inaktiverad: har visat 0 länge och ska inte trackas just nu.
  { id: "cash-or-crash-live", label: "Cash or Crash", apiSlug: "cash-or-crash-live", enabled: false },
  { id: "lightning-storm", label: "Lightning Storm", apiSlug: "lightning-storm" },
  { id: "red-door-roulette", label: "Red Door Roulette", apiSlug: "red-door-roulette" },
  { id: "crazy-balls", label: "Crazy Balls", apiSlug: "crazy-balls" },
  { id: "fan-tan-live", label: "Fan Tan", apiSlug: "fan-tan-live" },
  { id: "mega-ball", label: "Mega Ball", apiSlug: "mega-ball" },
  { id: "free-bet-blackjack", label: "Free Bet Blackjack", apiSlug: "free-bet-blackjack" },
  { id: "dream-catcher", label: "Dream Catcher", apiSlug: "dream-catcher" },
  { id: "dead-or-alive-saloon", label: "Dead or Alive Saloon", apiSlug: "dead-or-alive-saloon" },
  { id: "lightning-dice", label: "Lightning Dice", apiSlug: "lightning-dice" },
  { id: "auto-roulette", label: "Auto Roulette", apiSlug: "auto-roulette" },
  { id: "lightning-bac-bo", label: "Lightning Bac Bo", apiSlug: "lightning-bac-bo" },
  { id: "bac-bo", label: "Bac Bo", apiSlug: "bac-bo" },
  { id: "super-andar-bahar", label: "Super Andar Bahar", apiSlug: "super-andar-bahar" },
  { id: "speed-baccarat-a", label: "Speed Baccarat A", apiSlug: "speed-baccarat-a" },
  { id: "super-sic-bo", label: "Super Sic Bo", apiSlug: "super-sic-bo" },
  { id: "fortune-roulette", label: "Fortune Roulette", apiSlug: "fortune-roulette" },
  { id: "ice-fishing", label: "Ice Fishing", apiSlug: "ice-fishing" },
];

export const GAMES = ALL_GAMES.filter((game) => game?.enabled !== false);

/**
 * Delad färgpalett (används i header, listor, grafer)
 */
export const COLORS = {
  "crazy-time": "#C21807", // Rubinröd
  "crazy-time:a": "#26A69A", // Teal (A-varianten)
  "monopoly-live": "#66BB6A",
  "monopoly-big-baller": "#00e676",
  "funky-time": "#BA68C8",
  "lightning-roulette": "#29B6F6",
  "lightning-baccarat": "#8E44AD",
  "xxxtreme-lightning-roulette": "#FF7043",
  "immersive-roulette": "#9CCC65",
  "cash-or-crash-live": "#D4A017",
  "lightning-storm": "#1976D2", // Stark blå
  "red-door-roulette": "#EC407A",
  "crazy-balls": "#E57373", // Ljusare röd
  "fan-tan-live": "#5C6BC0",
  "mega-ball": "#00897B",
  "free-bet-blackjack": "#7CB342",
  "dream-catcher": "#FFB74D",
  "dead-or-alive-saloon": "#8D6E63",
  "lightning-dice": "#FFD54F",
  "auto-roulette": "#26C6DA",
  "lightning-bac-bo": "#C62828",
  "bac-bo": "#FF8A65",
  "super-andar-bahar": "#F06292",
  "speed-baccarat-a": "#4DB6AC",
  "super-sic-bo": "#D81B60",
  "fortune-roulette": "#6D4C41",
  "ice-fishing": "#AB47BC",
};

/** Hur många som räknas som “Top N” i listor/header */
export const TOP_N = 3;

/** Hjälpfunktion om du vill slå upp färg tryggt */
export const getGameColor = (id) => COLORS[id] || "#ffffff";
