"use client";

// Presents a fixed-game hourly curve with local hour selection and explicit data-quality gaps.

import React from "react";
import {
  Box, Button, Chip, CircularProgress, Collapse, FormControl, InputLabel,
  LinearProgress, MenuItem, Select, Stack, Typography,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import WorkspacePremiumRounded from "@mui/icons-material/WorkspacePremiumRounded";
import {
  Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer,
  Tooltip as RechartsTooltip, XAxis, YAxis,
} from "recharts";
import useMediaQuery from "@/lib/useMuiMediaQuery";
import { GAMES } from "@/config/games";
import { HOURLY_LOBBY_COHORT } from "@/config/hourlyLobbyCohort";
import { HOURLY_MIN_DAYS, HOURLY_MIN_SLOTS, HOURLY_MIN_SPAN_MS } from "@/lib/hourlyLobbyPolicy";
import { MOBILE_CHART_MARGIN, MOBILE_PLAYER_AXIS_WIDTH, mobileAccentFrameSx } from "@/lib/liveDashboardPresentation";

const GAME_LABELS = new Map(GAMES.map((game) => [game.id, game.label]));
const MUTED = "#a6b4ca";

function deltaPresentation(delta, formatter) {
  return Number.isFinite(delta)
    ? { text: `${delta > 0 ? "+" : ""}${formatter.format(delta)}%`, color: delta > 0 ? "#86efac" : delta < 0 ? "#fca5a5" : "#e2e8f0" }
    : { text: "—", color: MUTED };
}

function HourlyTooltip({ active, payload, numberFormatter, percentFormatter, translate }) {
  const row = active ? payload?.[0]?.payload : null;
  if (!row) return null;
  const delta = deltaPresentation(row.delta, percentFormatter);
  return (
    <Box sx={{ background: "#101b2e", border: "1px solid #345674", borderRadius: 2, p: 1.5, maxWidth: 240 }}>
      <Typography sx={{ color: "#bae6fd", fontWeight: 700 }}>{row.hour}:00</Typography>
      <Typography variant="body2" sx={{ color: "#e2e8f0" }}>
        {translate("Timsnitt", "Hourly average")}: {row.baseline == null ? "—" : numberFormatter.format(row.baseline)}
      </Typography>
      <Typography variant="body2" sx={{ color: delta.color }}>
        {translate("Live mot timsnitt", "Live vs hourly average")}: {delta.text}
      </Typography>
      <Typography variant="caption" sx={{ color: MUTED }}>
        {translate(`${row.distinctDays} giltiga dagar`, `${row.distinctDays} valid days`)}
      </Typography>
      {row.lastDay ? <Typography variant="caption" display="block" sx={{ color: MUTED }}>{row.firstDay} – {row.lastDay}</Typography> : null}
    </Box>
  );
}

function Metric({ label, value, detail, color = "#f1f5f9" }) {
  return (
    <Box sx={{ minWidth: 0, textAlign: "center" }}>
      <Typography variant="caption" sx={{ color: MUTED }}>{label}</Typography>
      <Typography sx={{ fontSize: { xs: 23, sm: 30 }, fontWeight: 750, color, fontVariantNumeric: "tabular-nums" }}>{value}</Typography>
      <Typography variant="caption" sx={{ color: MUTED }}>{detail}</Typography>
    </Box>
  );
}

export default function LivePlayersControlPanelHourlyBaselineSection({
  rows = [], coverage, updatedLabel, loading, error, numberFormatter, percentFormatter, translate,
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [chosenHour, setChosenHour] = React.useState(null);
  const [showDetails, setShowDetails] = React.useState(false);
  const selectId = React.useId();
  const gradientId = React.useId().replaceAll(":", "");
  const currentHour = rows.find((row) => row.isCurrentHour)?.hour ?? "00";
  const selectedHour = chosenHour ?? currentHour;
  const selected = rows.find((row) => row.hour === selectedHour);
  const currentTotal = rows[0]?.currentTotal ?? null;
  const readyHours = coverage?.readyHours ?? 0;
  const hasHistory = readyHours > 0;
  const expectedGames = coverage?.expectedGames ?? HOURLY_LOBBY_COHORT.gameIds.length;
  const delta = deltaPresentation(selected?.delta, percentFormatter);
  const slots = coverage?.requirements?.minimumSlotsPerHour ?? HOURLY_MIN_SLOTS;
  const minDays = coverage?.requirements?.minimumDistinctDays ?? HOURLY_MIN_DAYS;
  const spanMinutes = coverage?.requirements?.minimumSpanMinutes ?? HOURLY_MIN_SPAN_MS / 60000;
  const isHistoricalReference = rows.some((row) => row.status === "historical-reference");
  const expansion = coverage?.expansion;
  const waitingGames = expansion?.waitingGames ?? GAMES.filter((game) => !(coverage?.gameIds ?? HOURLY_LOBBY_COHORT.gameIds).includes(game.id))
    .map((game) => ({ id: game.id, coveredHours: 0, lastReadingAt: null }));
  const hours = Array.from({ length: 24 }, (_, hour) => String(hour).padStart(2, "0"));
  const status = coverage?.status;
  const statusText = status === "stale-baseline"
    ? translate("Historiken väntar på uppdatering. Livejämförelsen är pausad.", "History is awaiting an update. Live comparison is paused.")
    : status === "incomplete-live"
      ? translate("Livejämförelsen är pausad: ett eller flera spel saknar färska, fungerande mätningar.", "Live comparison is paused: one or more games have no fresh, healthy readings.")
      : status === "unsynchronized-live"
        ? translate("Livejämförelsen är pausad: spelens mättider ligger för långt ifrån varandra.", "Live comparison is paused: game readings were taken too far apart.")
        : null;
  const deltaPlayers = selected?.deltaPlayers;

  return (
    <Box sx={{
      ...mobileAccentFrameSx("rgba(56,189,248,0.44)"), width: "100%", minWidth: 0,
      background: "rgba(15,23,42,0.65)", borderRadius: 2, boxSizing: "border-box",
      p: { xs: 1.5, sm: 2.5 }, display: "flex", flexDirection: "column", gap: 2.5,
    }}>
      <Stack direction={{ xs: "column", md: "row" }} justifyContent="space-between" spacing={1.5}>
        <Box>
          <Stack direction="row" alignItems="center" spacing={1} sx={{ flexWrap: "wrap" }}>
            <Typography variant="overline" sx={{ color: "#7dd3fc", fontWeight: 800, letterSpacing: 1.1 }}>
              {translate("Timsnitt och live", "Hourly averages & live")}
            </Typography>
            <Chip size="small" icon={<WorkspacePremiumRounded />} label="Founder / Premium"
              sx={{ color: "#fde68a", background: "#3b301f", "& .MuiChip-icon": { color: "#fde68a" } }} />
          </Stack>
          <Typography variant="body2" sx={{ color: MUTED }}>
            {translate(`Jämförbart urval: ${expectedGames} av ${GAMES.length} lobbyspel. Samma spel i livevärdet och samtliga timsnitt.`,
              `Comparable selection: ${expectedGames} of ${GAMES.length} lobby games. The same games in the live total and every hourly average.`)}
          </Typography>
        </Box>
        <Box sx={{ textAlign: { xs: "left", md: "right" } }}>
          <Typography variant="body2" sx={{ color: "#cbd5e1" }}>{translate("Historisk referens · upp till 56 dagar", "Historical reference · up to 56 days")}</Typography>
          <Typography variant="caption" sx={{ color: MUTED }}>Europe/Stockholm</Typography>
        </Box>
      </Stack>

      <Typography variant="body2" sx={{ color: MUTED }}>
        {waitingGames.length
          ? translate(`${waitingGames.length} spel väntar på tillräcklig gemensam historik. Nya spel prövas dagligen och tas med först när hela timkurvan kan räknas om med samma utökade urval som livevärdet. Se status per spel nedan.`,
            `${waitingGames.length} games are waiting for sufficient shared history. New games are checked daily and included only when the entire hourly curve can be recalculated with the same expanded selection as the live total. See each game’s status below.`)
          : translate("Alla lobbyspel ingår. Samma spel används för varje timme och för livevärdet.",
            "All lobby games are included. The same games are used for every hour and for the live total.")}
      </Typography>
      {expansion?.lastChange ? <Typography variant="body2" sx={{ color: "#bae6fd" }}>
        {translate("Urvalet utökades", "Selection expanded")} {expansion.lastChange.at.slice(0, 10)}: {expansion.lastChange.addedGameIds.map((id) => GAME_LABELS.get(id) ?? id).join(", ")}. {translate("Hela kurvan räknades om. En nivåförändring vid urvalsbyte är inte ett mått på spelartillväxt.",
          "The entire curve was recalculated. A level change when the selection changes is not a measure of player growth.")}
      </Typography> : null}

      {error ? <Typography role="alert" sx={{ color: "#fca5a5" }}>
        {translate("Timhistoriken kunde inte uppdateras just nu.", "Hourly history could not be refreshed right now.")}
      </Typography> : null}
      {statusText && hasHistory ? <Typography role="status" variant="body2" sx={{ color: "#fde68a" }}>{statusText}</Typography> : null}
      {isHistoricalReference ? <Typography variant="body2" sx={{ color: MUTED }}>
        {translate("Historiskt referenssnitt från sparade mätningar. Insamlingen har varit ojämn och äldre mätningar saknar fullständig kvalitetsinformation. Se datum och täckning för varje timme; kurvan beskriver inte nödvändigtvis senaste veckan.",
          "Historical reference from saved readings. Collection has been uneven and older readings lack complete quality information. Check each hour’s dates and coverage; the curve does not necessarily describe the past week.")}
      </Typography> : null}

      {loading && !coverage?.computedAt ? (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 4 }}>
          <CircularProgress size={20} /><Typography sx={{ color: MUTED }}>{translate("Laddar timhistorik…", "Loading hourly history…")}</Typography>
        </Stack>
      ) : hasHistory ? (
        <>
          <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
            <FormControl size="small" sx={{
              minWidth: 170,
              "& .MuiInputLabel-root, & .MuiInputLabel-root.Mui-focused": { color: "#fff" },
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(255,255,255,0.55)" },
                "&:hover .MuiOutlinedInput-notchedOutline, &.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#fff" },
              },
              "& .MuiSelect-icon": { color: "#fff" },
            }}>
              <InputLabel id={`${selectId}-label`}>{translate("Jämför med timme", "Compare with hour")}</InputLabel>
              <Select labelId={`${selectId}-label`} value={selectedHour}
                label={translate("Jämför med timme", "Compare with hour")}
                MenuProps={{ slotProps: { paper: { sx: {
                  backgroundColor: "#172338", color: "#fff",
                  "& .MuiMenuItem-root:hover": { backgroundColor: "rgba(255,255,255,0.08)" },
                  "& .MuiMenuItem-root.Mui-selected": { backgroundColor: "rgba(56,189,248,0.22)" },
                  "& .MuiMenuItem-root.Mui-selected:hover, & .MuiMenuItem-root.Mui-focusVisible": { backgroundColor: "rgba(56,189,248,0.32)" },
                } } } }}
                onChange={(event) => setChosenHour(event.target.value)}>
                {hours.map((hour) => <MenuItem key={hour} value={hour}>{hour}:00{hour === currentHour ? translate(" · nu", " · now") : ""}</MenuItem>)}
              </Select>
            </FormControl>
            <Button onClick={() => setChosenHour(null)} sx={{ textTransform: "none", color: "#7dd3fc", minHeight: 44 }}>
              {translate("Följ aktuell timme", "Follow current hour")}
            </Button>
          </Stack>
          <Box aria-live="polite" sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(3, 1fr)" }, gap: 2 }}>
            <Metric label={translate(`Live · ${expectedGames} spel`, `Live · ${expectedGames} games`)}
              value={currentTotal == null ? "—" : numberFormatter.format(currentTotal)}
              detail={updatedLabel ? translate(`Senast mätt ${updatedLabel}`, `Last measured ${updatedLabel}`) : translate("Inväntar färska värden", "Awaiting fresh readings")} color="#fde68a" />
            <Metric label={translate(`Timsnitt ${selectedHour}:00`, `Hourly average ${selectedHour}:00`)}
              value={selected?.baseline == null ? "—" : numberFormatter.format(selected.baseline)}
              detail={selected?.lastDay
                ? `${selected.distinctDays} ${translate("dagar", "days")} · ${selected.firstDay} – ${selected.lastDay}`
                : translate("Otillräckligt underlag för timmen", "Insufficient coverage for this hour")} />
            <Metric label={translate("Live mot historiskt timsnitt", "Live vs historical hourly average")} value={delta.text} color={delta.color}
              detail={deltaPlayers == null ? translate("Jämförelse saknas", "Comparison unavailable")
                : `${deltaPlayers > 0 ? "+" : ""}${numberFormatter.format(deltaPlayers)} ${translate("spelare", "players")}`} />
          </Box>
          <Box role="img" aria-label={translate("Historiskt timsnitt med en vågrät linje för live nu. Välj timme med väljaren ovan.",
            "Historical hourly averages with a horizontal line for live now. Select an hour using the control above.")}
            sx={{ height: { xs: 245, sm: 310 }, minWidth: 0 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={rows} onClick={(state) => { if (hours.includes(state?.activeLabel)) setChosenHour(state.activeLabel); }}
                margin={isMobile ? { ...MOBILE_CHART_MARGIN, top: 25, right: 12 } : { top: 25, right: 18, left: 0, bottom: 0 }}>
                <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.23} /><stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                </linearGradient></defs>
                <CartesianGrid stroke="rgba(148,163,184,0.15)" vertical={false} />
                <XAxis dataKey="hour" ticks={isMobile ? ["00", "06", "12", "18", "23"] : ["00", "03", "06", "09", "12", "15", "18", "21", "23"]}
                  tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} />
                <YAxis width={isMobile ? MOBILE_PLAYER_AXIS_WIDTH : 70} domain={[0, "auto"]}
                  tickFormatter={(value) => isMobile && value >= 1000 ? `${Math.round(value / 1000)}k` : numberFormatter.format(value)}
                  tick={{ fill: MUTED, fontSize: 11 }} tickLine={false} axisLine={false} />
                <RechartsTooltip content={<HourlyTooltip numberFormatter={numberFormatter} percentFormatter={percentFormatter} translate={translate} />} />
                <Area type="linear" dataKey="baseline" stroke="#38bdf8" strokeWidth={2.5} fill={`url(#${gradientId})`}
                  connectNulls={false} dot={{ r: 2 }} isAnimationActive={false} />
                <ReferenceLine x={selectedHour} stroke="#94a3b8" strokeDasharray="3 4" />
                {currentHour !== selectedHour ? <ReferenceLine x={currentHour} stroke="#64748b" label={{ value: translate("Nu", "Now"), fill: MUTED, fontSize: 11 }} /> : null}
                {currentTotal != null ? <ReferenceLine y={currentTotal} stroke="#fde68a" strokeDasharray="7 4" ifOverflow="extendDomain"
                  label={{ value: translate("Live nu", "Live now"), fill: "#fde68a", fontSize: 11, position: "insideTopRight" }} /> : null}
              </AreaChart>
            </ResponsiveContainer>
          </Box>
          <Typography variant="caption" sx={{ color: MUTED }}>
            {translate("Blå kurva: timsnitt. Gul linje: samma livevärde jämfört med dygnets timmar. Luckor betyder otillräckligt underlag.",
              "Blue curve: hourly average. Yellow line: the same live reading compared with each hour. Gaps mean insufficient data.")}
          </Typography>
        </>
      ) : !loading && !error ? (
        <Box role="status" sx={{ py: 2 }}>
          <Typography sx={{ color: "#e2e8f0", fontWeight: 700, mb: 1 }}>
            {status === "not-materialized"
              ? translate("Timhistoriken har inte sammanställts ännu", "Hourly history has not been prepared yet")
              : translate("Sparade mätningar räcker ännu inte för ett timsnitt", "Saved readings do not yet provide enough hourly coverage")}
          </Typography>
          <Typography variant="body2" sx={{ color: MUTED, maxWidth: 750 }}>
            {status === "not-materialized"
              ? translate("Det betyder inte att äldre speldata saknas. Den gemensamma sammanställningen av befintlig historik behöver köras innan sidan kan visa den.",
                "This does not mean older game data is missing. The shared preparation of existing history must run before this page can display it.")
              : translate(`En timme behöver ${minDays} dagar med minst ${slots} kompletta mätintervall, minst ${spanMinutes} minuter isär. Samma ${expectedGames} spel måste finnas varje gång. Äldre kvalificerade dagar räknas också.`,
                `An hour needs ${minDays} days with at least ${slots} complete reading intervals spanning ${spanMinutes} minutes. The same ${expectedGames} games must be present every time. Older qualifying days count too.`)}
          </Typography>
        </Box>
      ) : null}

      <Box>
        <Stack direction="row" justifyContent="space-between" spacing={1} sx={{ mb: 1 }}>
          <Typography variant="caption" sx={{ color: MUTED }}>{translate("Timmar med tillräckligt underlag", "Hours with sufficient data")}</Typography>
          <Typography variant="caption" sx={{ color: "#cbd5e1" }}>{readyHours} / 24</Typography>
        </Stack>
        <LinearProgress variant="determinate" value={readyHours / 24 * 100}
          sx={{ height: 4, borderRadius: 1, backgroundColor: "#253247", "& .MuiLinearProgress-bar": { backgroundColor: "#38bdf8" } }} />
      </Box>
      <Box sx={{ borderTop: "1px solid rgba(148,163,184,0.18)", pt: 1 }}>
        <Button onClick={() => setShowDetails((value) => !value)} aria-expanded={showDetails} aria-controls={`${selectId}-details`}
          sx={{ textTransform: "none", color: "#bae6fd", minHeight: 44 }}>
          {showDetails ? translate("Dölj mätmetod och spelstatus", "Hide methodology and game status") : translate("Så mäter vi · visa spelstatus", "How we measure · show game status")}
        </Button>
        <Collapse in={showDetails}>
          <Box id={`${selectId}-details`} sx={{ pt: 1 }}>
            <Typography variant="body2" sx={{ color: MUTED, mb: 2 }}>
              {translate(`Vi sparar tillgängliga mätningar även för spel som ännu inte ingår. Ett nytt spel behöver gemensamma mättillfällen med hela det befintliga urvalet: minst ${minDays} giltiga dagar för var och en av dygnets 24 timmar, varav minst ${expansion?.requirements?.minimumRecentDays ?? 3} under senaste veckan. En dag/timme behöver minst ${slots} mätintervall över ${spanMinutes} minuter.`,
                `We save available readings for games that are not yet included. A new game needs readings at the same times as the entire existing selection: at least ${minDays} valid days for each of the 24 hours, including at least ${expansion?.requirements?.minimumRecentDays ?? 3} in the past week. A day/hour needs at least ${slots} reading intervals spanning ${spanMinutes} minutes.`)}
            </Typography>
            <Typography variant="body2" sx={{ color: MUTED, mb: 2 }}>
              {translate("När ett spel kvalificerar sig byts hela jämförelseunderlaget samtidigt. Gamla och nya urval skarvas inte ihop. Om ett inkluderat spel tillfälligt saknar färska värden pausas livejämförelsen; spelet tas inte bort och räknas inte som noll. Det finns inget fast startdatum för väntande spel eftersom täckningen beror på datakällorna.",
                "When a game qualifies, the entire comparison is updated together. Old and new selections are not stitched together. If an included game temporarily lacks fresh readings, live comparison pauses; the game is not removed or counted as zero. Waiting games have no fixed inclusion date because coverage depends on the data sources.")}
            </Typography>
            {waitingGames.length ? <Box sx={{ mb: 2 }}>
              <Typography sx={{ color: "#e2e8f0", fontWeight: 700, mb: 1 }}>{translate("Spel som samlar underlag", "Games collecting coverage")}</Typography>
              <Typography variant="caption" sx={{ color: MUTED }}>
                {translate("Timmar klara avser gemensamma mätningar med hela urvalet. Status räknas om dagligen.",
                  "Ready hours require shared readings with the entire selection. Status is recalculated daily.")}
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, minmax(0, 1fr))" }, gap: 1, mt: 1 }}>
                {waitingGames.map((game) => <Box key={game.id} sx={{ border: "1px solid #29394e", borderRadius: 1, p: 1.25 }}>
                  <Typography variant="body2" sx={{ color: "#e2e8f0" }}>{GAME_LABELS.get(game.id) ?? game.id}</Typography>
                  <Typography variant="caption" sx={{ color: MUTED }}>{game.coveredHours} / 24 {translate("timmar klara", "hours ready")}</Typography>
                  <Typography variant="caption" display="block" sx={{ color: MUTED }}>
                    {game.lastReadingAt ? translate(`Senaste användbara mätning i underlaget: ${game.lastReadingAt.slice(0, 10)}`,
                      `Last usable reading in the reference: ${game.lastReadingAt.slice(0, 10)}`)
                      : translate("Inväntar användbara mätningar", "Awaiting usable readings")}
                  </Typography>
                </Box>)}
              </Box>
            </Box> : null}
            <Typography variant="body2" sx={{ color: MUTED, mb: 2 }}>
              {translate(`Varje giltig dag väger lika. En dag/timme behöver minst ${slots} mätintervall över ${spanMinutes} minuter. Saknade värden fylls inte ut och misstänkt frysta serier utesluts. Spelurvalet är identiskt för live och alla timmar inom varje publicerad jämförelse.`,
                `Each valid day has equal weight. A day/hour needs at least ${slots} reading intervals spanning ${spanMinutes} minutes. Missing readings are not filled in and suspected frozen series are excluded. Each published comparison uses identical games for live and every hour.`)}
            </Typography>
            {coverage?.history ? <Typography variant="body2" sx={{ color: MUTED, mb: 2 }}>
              {translate(`${numberFormatter.format(coverage.history.rawSamples)} äldre spelmätningar granskade · ${numberFormatter.format(coverage.history.matchedObservations)} gemensamma mätningar för det fasta urvalet.`,
                `${numberFormatter.format(coverage.history.rawSamples)} older game readings reviewed · ${numberFormatter.format(coverage.history.matchedObservations)} matching readings for the fixed selection.`)}
            </Typography> : null}
            <Box sx={{ display: "grid", gridTemplateColumns: { xs: "repeat(3, 1fr)", sm: "repeat(6, 1fr)" }, gap: 1, mb: 2 }}>
              {hours.map((hour) => {
                const row = rows.find((candidate) => candidate.hour === hour);
                return <Button key={hour} onClick={() => setChosenHour(hour)} aria-pressed={hour === selectedHour}
                  sx={{ display: "block", textTransform: "none", minHeight: 65, color: "#cbd5e1", border: "1px solid", borderColor: hour === selectedHour ? "#38bdf8" : "#29394e" }}>
                  <Typography variant="body2">{hour}:00</Typography>
                  <Typography variant="caption">{row?.baseline == null ? "—" : numberFormatter.format(row.baseline)}</Typography>
                  <Typography variant="caption" display="block" sx={{ color: MUTED }}>{row?.distinctDays ?? 0} {translate("dagar", "days")}</Typography>
                  <Typography variant="caption" display="block" sx={{ color: MUTED }}>{row?.recentDistinctDays ?? 0} {translate("senaste veckan", "in the past week")}</Typography>
                </Button>;
              })}
            </Box>
            <Typography variant="caption" sx={{ color: MUTED }}>{(coverage?.gameIds ?? []).map((id) => GAME_LABELS.get(id) ?? id).join(" · ")}</Typography>
            {coverage?.period ? <Typography variant="caption" display="block" sx={{ color: MUTED, mt: 1 }}>
              {translate("Period från", "Period from")} {coverage.period.startDay} · {translate("Fram till", "Until")} {coverage.period.endDay} ({translate("exklusive", "exclusive")})
            </Typography> : null}
          </Box>
        </Collapse>
      </Box>
    </Box>
  );
}
