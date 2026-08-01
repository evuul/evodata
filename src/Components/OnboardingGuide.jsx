"use client";

// Gives new accounts a short, dismissible tour of the dashboard.

import { Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle, Stack, Typography } from "@mui/material";
import AutoGraphRounded from "@mui/icons-material/AutoGraphRounded";
import CalendarMonthRounded from "@mui/icons-material/CalendarMonthRounded";
import AccountBalanceRounded from "@mui/icons-material/AccountBalanceRounded";
import ManageSearchRounded from "@mui/icons-material/ManageSearchRounded";

const STEPS = [
  { Icon: AutoGraphRounded, color: "#38bdf8", sv: "Följ live-data", en: "Follow live data", detailSv: "Se live players, speltrender och ATH för Evolution-spelen.", detailEn: "Track live players, game trends and ATH records for Evolution games." },
  { Icon: CalendarMonthRounded, color: "#a78bfa", sv: "Håll koll på rapporter", en: "Stay ahead of reports", detailSv: "Kalendern och forecasten samlar nästa rapport, event och omsättningsprognos.", detailEn: "The calendar and forecast bring reports, events and revenue estimates together." },
  { Icon: AccountBalanceRounded, color: "#34d399", sv: "Analysera aktien", en: "Analyse the share", detailSv: "Jämför fair value, återköp, blankning och finansiella nyckeltal.", detailEn: "Compare fair value, buybacks, short interest and financial metrics." },
  { Icon: ManageSearchRounded, color: "#fbbf24", sv: "Anpassa din bevakning", en: "Personalise your watch", detailSv: "Spara dina viktigaste vyer och använd Mina sidor för portfölj och notiser.", detailEn: "Save the views that matter most and use My Page for portfolio and alerts." },
];

export default function OnboardingGuide({ open, onClose, translate }) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" PaperProps={{ sx: { backgroundColor: "#111c2f", color: "#f8fafc", border: "1px solid rgba(148,163,184,0.24)", borderRadius: "18px" } }}>
      <DialogTitle sx={{ pb: 1, fontWeight: 800 }}>
        {translate("Välkommen till EvoTracker", "Welcome to EvoTracker")}
      </DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ color: "rgba(226,232,240,0.72)", mb: 2.2 }}>
          {translate("Här är en snabb överblick över var du hittar det viktigaste.", "Here is a quick overview of where to find the important things.")}
        </Typography>
        <Stack spacing={1.1}>
          {STEPS.map(({ Icon, color, sv, en, detailSv, detailEn }, index) => (
            <Stack key={sv} direction="row" spacing={1.2} alignItems="flex-start" sx={{ p: 1.2, borderRadius: "12px", backgroundColor: "rgba(15,23,42,0.55)", border: "1px solid rgba(148,163,184,0.14)" }}>
              <Chip icon={<Icon sx={{ color: `${color} !important` }} />} label={`0${index + 1}`} size="small" sx={{ minWidth: 48, color, backgroundColor: `${color}18`, fontWeight: 800 }} />
              <Stack spacing={0.25}>
                <Typography sx={{ fontWeight: 750 }}>{translate(sv, en)}</Typography>
                <Typography variant="caption" sx={{ color: "rgba(226,232,240,0.68)", lineHeight: 1.5 }}>{translate(detailSv, detailEn)}</Typography>
              </Stack>
            </Stack>
          ))}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.2 }}>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: "10px", textTransform: "none", fontWeight: 750, backgroundColor: "#38bdf8", color: "#082f49", "&:hover": { backgroundColor: "#7dd3fc" } }}>
          {translate("Börja utforska", "Start exploring")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
