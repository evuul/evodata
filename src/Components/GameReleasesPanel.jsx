"use client";

// Presents sourced major Evolution live and game-show launches as a responsive release timeline.

import { useMemo } from "react";
import { Box, Chip, Link, Stack, Typography } from "@mui/material";
import AutoAwesomeRounded from "@mui/icons-material/AutoAwesomeRounded";
import OpenInNewRounded from "@mui/icons-material/OpenInNewRounded";
import SportsEsportsRounded from "@mui/icons-material/SportsEsportsRounded";
import gameReleases from "@/app/data/gameReleases";
import { useLocale, useTranslate } from "@/context/LocaleContext";
import { prepareGameReleaseSchedule } from "@/lib/gameReleaseSchedule";
import { getStockholmTodayYmd } from "@/lib/livePlayersControlPanel";

function formatReleaseDate(release, locale, translate) {
  if (!release.releaseDate) {
    return translate(
      `${release.releaseWindow} · exakt datum ej kommunicerat`,
      `${release.releaseWindow} · exact date not announced`
    );
  }

  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "sv-SE", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(`${release.releaseDate}T12:00:00Z`));
}

function ReleaseCard({ release, locale, translate, featured = false }) {
  const description = locale === "en" ? release.descriptionEn : release.descriptionSv;
  const sourceLabel = locale === "en" ? release.sourceLabelEn : release.sourceLabelSv;
  const imageAlt = locale === "en" ? release.imageAltEn : release.imageAltSv;
  const isReleased = release.status === "released";
  const statusLabel = isReleased
    ? translate("Lanserat", "Released")
    : release.timing === "confirmed"
      ? translate("Datum bekräftat", "Date confirmed")
      : translate("Offentliggjort", "Announced");

  return (
    <Box
      component="article"
      sx={{
        overflow: "hidden",
        borderRadius: "20px",
        minWidth: 0,
        background: "rgba(15,23,42,0.62)",
        border: featured ? "1px solid rgba(250,204,21,0.38)" : "1px solid rgba(148,163,184,0.18)",
        boxShadow: featured ? "0 18px 44px rgba(15,23,42,0.28)" : "none",
      }}
    >
      {release.imageUrl ? (
        <Box
          component="img"
          src={release.imageUrl}
          alt={imageAlt}
          loading={featured ? "eager" : "lazy"}
          sx={{
            display: "block",
            width: "100%",
            height: { xs: 190, sm: featured ? 280 : 220 },
            objectFit: release.id === "game-night" ? "contain" : "cover",
            objectPosition: release.id === "monopoly-filthy-rich" ? "center 42%" : "center",
            backgroundColor: release.id === "game-night" ? "#000" : "#111827",
          }}
        />
      ) : (
        <Box
          role="img"
          aria-label={imageAlt}
          sx={{
            height: { xs: 190, sm: featured ? 280 : 220 },
            display: "grid",
            placeItems: "center",
            overflow: "hidden",
            position: "relative",
            background:
              "radial-gradient(circle at 20% 20%, rgba(250,204,21,0.3), transparent 30%), radial-gradient(circle at 80% 75%, rgba(168,85,247,0.34), transparent 34%), linear-gradient(135deg, #172554, #312e81 52%, #111827)",
            "&::before": {
              content: '""',
              position: "absolute",
              inset: 18,
              borderRadius: "18px",
              border: "1px solid rgba(255,255,255,0.16)",
            },
          }}
        >
          <Stack spacing={0.7} alignItems="center" sx={{ position: "relative", zIndex: 1, px: 2, textAlign: "center" }}>
            <SportsEsportsRounded sx={{ color: "#fde68a", fontSize: 44 }} />
            <Typography sx={{ color: "#fff", fontWeight: 950, fontSize: { xs: "1.55rem", sm: "2rem" }, letterSpacing: 0.4 }}>
              {release.title}
            </Typography>
            <Typography variant="caption" sx={{ color: "rgba(224,231,255,0.78)", fontWeight: 750, textTransform: "uppercase", letterSpacing: 1.4 }}>
              Evolution live casino
            </Typography>
          </Stack>
        </Box>
      )}
      <Stack spacing={1.1} sx={{ p: { xs: 1.7, sm: 2.1 } }}>
        <Stack direction="row" gap={0.8} flexWrap="wrap" alignItems="center">
          <Chip
            size="small"
            label={statusLabel}
            sx={{
              color: isReleased ? "#86efac" : "#fde68a",
              backgroundColor: isReleased ? "rgba(34,197,94,0.14)" : "rgba(234,179,8,0.14)",
              border: `1px solid ${isReleased ? "rgba(34,197,94,0.3)" : "rgba(234,179,8,0.3)"}`,
              fontWeight: 800,
            }}
          />
          <Chip
            size="small"
            label={release.type === "game-show" ? "Game show" : "Live"}
            sx={{ color: "#bae6fd", backgroundColor: "rgba(14,165,233,0.13)", fontWeight: 750 }}
          />
        </Stack>
        <Typography
          variant={featured ? "h4" : "h5"}
          sx={{ color: "#f8fafc", fontWeight: 900, fontSize: featured ? { xs: "1.55rem", sm: "2rem" } : "1.25rem" }}
        >
          {release.title}
        </Typography>
        <Typography sx={{ color: "#fcd34d", fontWeight: 800, fontSize: "0.9rem" }}>
          {formatReleaseDate(release, locale, translate)}
        </Typography>
        <Typography variant="body2" sx={{ color: "rgba(203,213,225,0.8)", lineHeight: 1.65 }}>
          {description}
        </Typography>
        <Link
          href={release.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          underline="hover"
          sx={{
            width: "fit-content",
            color: "#7dd3fc",
            fontSize: "0.8rem",
            display: "inline-flex",
            alignItems: "center",
            gap: 0.45,
          }}
        >
          {sourceLabel} <OpenInNewRounded sx={{ fontSize: 14 }} />
        </Link>
      </Stack>
    </Box>
  );
}

export default function GameReleasesPanel() {
  const translate = useTranslate();
  const { locale } = useLocale();
  const schedule = useMemo(
    () => prepareGameReleaseSchedule(gameReleases, getStockholmTodayYmd()),
    []
  );

  return (
    <Box
      sx={{
        width: "100%",
        mx: { xs: 0, sm: -3, md: -4 },
        px: { xs: 2, sm: 3, md: 4 },
        py: { xs: 3, md: 4 },
        color: "#f8fafc",
        boxSizing: "border-box",
        overflowX: "hidden",
      }}
    >
      <Stack spacing={{ xs: 3, md: 4 }} sx={{ width: "100%", maxWidth: 1180, mx: "auto" }}>
        <Stack spacing={0.9} alignItems="center" textAlign="center">
          <SportsEsportsRounded sx={{ color: "#fcd34d", fontSize: 36 }} />
          <Typography variant="h3" sx={{ fontWeight: 900, fontSize: { xs: "1.9rem", sm: "2.5rem" } }}>
            {translate("Stora spelsläpp", "Major game releases")}
          </Typography>
          <Typography sx={{ color: "rgba(203,213,225,0.76)", maxWidth: 720, lineHeight: 1.65 }}>
            {translate(
              "Officiellt kommunicerade live- och game show-släpp från Evolution, med datum när bolaget har bekräftat dem.",
              "Officially announced Evolution live and game-show releases, with dates when confirmed by the company."
            )}
          </Typography>
        </Stack>

        <Stack spacing={1.4} sx={{ width: "100%" }}>
          <Stack direction="row" gap={0.8} alignItems="center" justifyContent="center">
            <AutoAwesomeRounded sx={{ color: "#fcd34d", fontSize: 21 }} />
            <Typography variant="h5" sx={{ fontWeight: 850, textAlign: "center" }}>
              {translate("Kommande", "Upcoming")}
            </Typography>
          </Stack>
          {schedule.upcoming.length ? (
            <Box
              sx={{
                display: "grid",
                width: "100%",
                maxWidth: schedule.upcoming.length > 1 ? 1180 : 760,
                gridTemplateColumns:
                  schedule.upcoming.length > 1
                    ? { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }
                    : "minmax(0, 760px)",
                justifyContent: "center",
                mx: "auto",
                gap: 2,
              }}
            >
              {schedule.upcoming.map((release, index) => (
                <ReleaseCard
                  key={release.id}
                  release={release}
                  locale={locale}
                  translate={translate}
                  featured={index === 0}
                />
              ))}
            </Box>
          ) : (
            <Typography sx={{ color: "rgba(148,163,184,0.75)" }}>
              {translate("Inga kommande större släpp är offentliggjorda just nu.", "No upcoming major releases are currently announced.")}
            </Typography>
          )}
        </Stack>

        {schedule.released.length ? (
          <Stack spacing={1.4} sx={{ width: "100%" }}>
            <Typography variant="h5" sx={{ fontWeight: 850, textAlign: "center" }}>
              {translate("Nyligen lanserade", "Recently released")}
            </Typography>
            <Box sx={{ display: "grid", width: "100%", gridTemplateColumns: { xs: "1fr", md: "repeat(2, minmax(0, 1fr))" }, gap: 2 }}>
              {schedule.released.map((release) => (
                <ReleaseCard key={release.id} release={release} locale={locale} translate={translate} />
              ))}
            </Box>
          </Stack>
        ) : null}

        <Typography variant="caption" sx={{ color: "rgba(148,163,184,0.66)", textAlign: "center", lineHeight: 1.6 }}>
          {translate(
            "Datum och beskrivningar bygger på Evolutions officiella newsroom och produktroadmap. Poster utan exakt datum uppdateras först när Evolution kommunicerar ett datum.",
            "Dates and descriptions are based on Evolution's official newsroom and product roadmap. Entries without an exact date are updated only when Evolution announces one."
          )}
        </Typography>
      </Stack>
    </Box>
  );
}
