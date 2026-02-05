export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { getDailyLobbyPeak, getGlobalLobbyAth } from "@/lib/csStore";

const TZ = "Europe/Stockholm";
const CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";

const YMD_FORMATTER = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

function normalizeFormattedYMD(value) {
  const parts = String(value)
    .split(/[^\d]/)
    .filter(Boolean);
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${year.padStart(4, "0")}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return value;
}

function stockholmTodayYMD() {
  try {
    return normalizeFormattedYMD(YMD_FORMATTER.format(new Date()));
  } catch {
    return new Date().toISOString().slice(0, 10);
  }
}

function shiftStockholmYmd(baseYmd, offsetDays) {
  if (!baseYmd || !Number.isFinite(offsetDays)) return null;
  const [year, month, day] = baseYmd.split("-").map((part) => Number(part));
  if (![year, month, day].every((part) => Number.isFinite(part))) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  date.setUTCDate(date.getUTCDate() + offsetDays);
  return normalizeFormattedYMD(YMD_FORMATTER.format(date));
}

export async function GET() {
  try {
    const todayYmd = stockholmTodayYMD();
    const yesterdayYmd = shiftStockholmYmd(todayYmd, -1);

    const [todayPeakRaw, yesterdayPeakRaw, lobbyAth] = await Promise.all([
      todayYmd ? getDailyLobbyPeak(todayYmd) : Promise.resolve(null),
      yesterdayYmd ? getDailyLobbyPeak(yesterdayYmd) : Promise.resolve(null),
      getGlobalLobbyAth(),
    ]);

    return new Response(
      JSON.stringify({
        ok: true,
        todayPeak: todayPeakRaw ?? null,
        yesterdayPeak: yesterdayPeakRaw ?? null,
        lobbyAth: lobbyAth ?? null,
        updatedAt: new Date().toISOString(),
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": CACHE_CONTROL,
        },
      }
    );
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: error?.message || String(error) }), {
      status: 500,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": CACHE_CONTROL,
      },
    });
  }
}
