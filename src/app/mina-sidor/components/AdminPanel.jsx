import { useMemo, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Stack,
    TextField,
    Typography,
    ToggleButton,
    ToggleButtonGroup
} from "@mui/material";
import CheckCircleRounded from "@mui/icons-material/CheckCircleRounded";
import { statusColors } from "@/Components/MinaSidor/styles";

export function AdminPanel({
    adminPanel, setAdminPanel,
    translate, locale,
    // Actions
    handleAdminMailTest,
    handleAdminMailPreview,
    handleAdminAthPreview,
    handleAdminAthSendNow,
    handleAdminDailyAvgPreview,
    handleAdminDailyAvgSendNow,
    loadAdminActivity,
    loadAdminUsers,
    loadAdminSupport,
    createDemoSupportTicket,
    openAdminSupportTicket,
    saveAlertsSettings,
    loadAdminCost,
    // State
    mailTestLoading,
    mailTestMessage,
    previewLoading,
    adminActivityLoading,
    adminActivityError,
    adminActivityRows,
    adminActivityGeoSummary,
    adminUsersLoading,
    adminUsersError,
    adminUsersRows,
    adminUsersTotal,
    adminPmDialogOpen,
    setAdminPmDialogOpen,
    adminPmRecipient,
    adminPmToEmail,
    setAdminPmToEmail,
    adminPmSubject,
    setAdminPmSubject,
    adminPmMessage,
    setAdminPmMessage,
    adminPmSending,
    adminPmStatus,
    openAdminPmDialog,
    sendAdminPm,
    applyAdminDonationTemplate,
    adminSupportLoading,
    adminSupportError,
    adminSupportRows,
    adminCostLoading,
    adminCostError,
    adminCostData,
    alertsSettingsLoading,
    alertsSettingsError,
    alertsTestOnlyAdmin,
    alertsAthEnabled,
    alertsDailyAvgEnabled,
    profileIdentity,
    user
}) {
    const [adminUserEmailFilter, setAdminUserEmailFilter] = useState("");
    const normalizedUserEmailFilter = String(adminUserEmailFilter || "").trim().toLowerCase();
    const filteredAdminUsers = useMemo(() => {
        if (!normalizedUserEmailFilter) return adminUsersRows;
        return adminUsersRows.filter((row) =>
            String(row?.email || "").toLowerCase().includes(normalizedUserEmailFilter)
        );
    }, [adminUsersRows, normalizedUserEmailFilter]);
    const exactEmailMatch = useMemo(
        () =>
            adminUsersRows.find(
                (row) => String(row?.email || "").toLowerCase() === normalizedUserEmailFilter
            ) || null,
        [adminUsersRows, normalizedUserEmailFilter]
    );
    const athOnCount = adminUsersRows.filter((row) => Boolean(row?.athEmailEnabled)).length;
    const athOffCount = adminUsersRows.length - athOnCount;
    const dailyAvgOnCount = adminUsersRows.filter((row) => Boolean(row?.dailyAvgEmailEnabled)).length;
    const dailyAvgOffCount = adminUsersRows.length - dailyAvgOnCount;

    return (
        <Stack spacing={1.1} alignItems="center">
            <ToggleButtonGroup
                value={adminPanel}
                exclusive
                onChange={(_, value) => value && setAdminPanel(value)}
                size="small"
                sx={{
                    backgroundColor: "rgba(148,163,184,0.12)",
                    borderRadius: "999px",
                    p: 0.5,
                }}
            >
                <ToggleButton
                    value="tools"
                    sx={{
                        textTransform: "none",
                        border: 0,
                        borderRadius: "999px!important",
                        px: 1.4,
                        color: "rgba(226,232,240,0.8)",
                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(56,189,248,0.25)" },
                    }}
                >
                    {translate("Verktyg", "Tools")}
                </ToggleButton>
                <ToggleButton
                    value="activity"
                    sx={{
                        textTransform: "none",
                        border: 0,
                        borderRadius: "999px!important",
                        px: 1.4,
                        color: "rgba(226,232,240,0.8)",
                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(34,197,94,0.25)" },
                    }}
                >
                    {translate("Aktivitet", "Activity")}
                </ToggleButton>
                <ToggleButton
                    value="users"
                    sx={{
                        textTransform: "none",
                        border: 0,
                        borderRadius: "999px!important",
                        px: 1.4,
                        color: "rgba(226,232,240,0.8)",
                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(167,139,250,0.28)" },
                    }}
                >
                    {translate("Användare", "Users")}
                </ToggleButton>
                <ToggleButton
                    value="cost"
                    sx={{
                        textTransform: "none",
                        border: 0,
                        borderRadius: "999px!important",
                        px: 1.4,
                        color: "rgba(226,232,240,0.8)",
                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(14,165,233,0.28)" },
                    }}
                >
                    {translate("Kostnad", "Cost")}
                </ToggleButton>
                <ToggleButton
                    value="support"
                    sx={{
                        textTransform: "none",
                        border: 0,
                        borderRadius: "999px!important",
                        px: 1.4,
                        color: "rgba(226,232,240,0.8)",
                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(245,158,11,0.22)" },
                    }}
                >
                    {translate("Support", "Support")}
                </ToggleButton>
            </ToggleButtonGroup>

            {adminPanel === "tools" ? (
                <Stack spacing={1.2} sx={{ width: "100%", alignItems: "center" }}>
                    <Stack spacing={0.8} sx={{ width: "100%", maxWidth: 980 }}>
                        <Typography sx={{ color: "rgba(226,232,240,0.78)", textAlign: "center", fontWeight: 800 }}>
                            {translate("Alert-inställningar", "Alert settings")}
                        </Typography>
                        {alertsSettingsError ? (
                            <Typography sx={{ color: statusColors.warning, textAlign: "center" }}>
                                {alertsSettingsError}
                            </Typography>
                        ) : null}
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" sx={{ justifyContent: "center" }}>
                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={alertsTestOnlyAdmin ? "admin" : "live"}
                                onChange={(_, value) => {
                                    if (!value) return;
                                    saveAlertsSettings({ testOnlyAdmin: value === "admin" });
                                }}
                                sx={{
                                    backgroundColor: "rgba(15,23,42,0.45)",
                                    borderRadius: "999px",
                                    p: 0.3,
                                }}
                            >
                                <ToggleButton
                                    value="admin"
                                    sx={{
                                        textTransform: "none",
                                        border: 0,
                                        borderRadius: "999px!important",
                                        px: 1.4,
                                        color: "rgba(226,232,240,0.8)",
                                        "&.Mui-selected": { color: "#bbf7d0", backgroundColor: "rgba(34,197,94,0.22)" },
                                    }}
                                >
                                    {translate("Test: endast admin", "Test: admin only")}
                                </ToggleButton>
                                <ToggleButton
                                    value="live"
                                    sx={{
                                        textTransform: "none",
                                        border: 0,
                                        borderRadius: "999px!important",
                                        px: 1.4,
                                        color: "rgba(226,232,240,0.8)",
                                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(148,163,184,0.18)" },
                                    }}
                                >
                                    {translate("Live utskick", "Live sending")}
                                </ToggleButton>
                            </ToggleButtonGroup>

                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={alertsAthEnabled ? "on" : "off"}
                                onChange={(_, value) => value && saveAlertsSettings({ athEnabled: value === "on" })}
                                sx={{
                                    backgroundColor: "rgba(15,23,42,0.45)",
                                    borderRadius: "999px",
                                    p: 0.3,
                                }}
                            >
                                <ToggleButton
                                    value="on"
                                    sx={{
                                        textTransform: "none",
                                        border: 0,
                                        borderRadius: "999px!important",
                                        px: 1.4,
                                        color: "rgba(226,232,240,0.8)",
                                        "&.Mui-selected": { color: "#fde68a", backgroundColor: "rgba(245,158,11,0.18)" },
                                    }}
                                >
                                    {translate("ATH: På", "ATH: On")}
                                </ToggleButton>
                                <ToggleButton
                                    value="off"
                                    sx={{
                                        textTransform: "none",
                                        border: 0,
                                        borderRadius: "999px!important",
                                        px: 1.4,
                                        color: "rgba(226,232,240,0.8)",
                                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(148,163,184,0.18)" },
                                    }}
                                >
                                    {translate("ATH: Av", "ATH: Off")}
                                </ToggleButton>
                            </ToggleButtonGroup>

                            <ToggleButtonGroup
                                exclusive
                                size="small"
                                value={alertsDailyAvgEnabled ? "on" : "off"}
                                onChange={(_, value) => value && saveAlertsSettings({ dailyAvgEnabled: value === "on" })}
                                sx={{
                                    backgroundColor: "rgba(15,23,42,0.45)",
                                    borderRadius: "999px",
                                    p: 0.3,
                                }}
                            >
                                <ToggleButton
                                    value="on"
                                    sx={{
                                        textTransform: "none",
                                        border: 0,
                                        borderRadius: "999px!important",
                                        px: 1.4,
                                        color: "rgba(226,232,240,0.8)",
                                        "&.Mui-selected": { color: "#bfdbfe", backgroundColor: "rgba(59,130,246,0.18)" },
                                    }}
                                >
                                    {translate("Daily AVG: På", "Daily AVG: On")}
                                </ToggleButton>
                                <ToggleButton
                                    value="off"
                                    sx={{
                                        textTransform: "none",
                                        border: 0,
                                        borderRadius: "999px!important",
                                        px: 1.4,
                                        color: "rgba(226,232,240,0.8)",
                                        "&.Mui-selected": { color: "#f8fafc", backgroundColor: "rgba(148,163,184,0.18)" },
                                    }}
                                >
                                    {translate("Daily AVG: Av", "Daily AVG: Off")}
                                </ToggleButton>
                            </ToggleButtonGroup>
                        </Stack>
                        {alertsSettingsLoading ? (
                            <Typography sx={{ color: "rgba(226,232,240,0.6)", textAlign: "center" }}>
                                {translate("Laddar...", "Loading...")}
                            </Typography>
                        ) : null}
                    </Stack>

                    <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
                        <Button
                            variant="outlined"
                            onClick={() => handleAdminMailTest(profileIdentity, user?.email)}
                            disabled={mailTestLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(255,255,255,0.75)",
                                color: "#ffffff",
                                "&:hover": {
                                    borderColor: "#ffffff",
                                    backgroundColor: "rgba(255,255,255,0.08)",
                                },
                                "&.Mui-disabled": {
                                    opacity: 1,
                                    borderColor: "rgba(255,255,255,0.42)",
                                    color: "rgba(255,255,255,0.72)",
                                    backgroundColor: "rgba(255,255,255,0.06)",
                                },
                            }}
                        >
                            {mailTestLoading
                                ? translate("Skickar testmail...", "Sending test email...")
                                : translate("Skicka testmail", "Send test email")}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => handleAdminMailPreview("welcome")}
                            disabled={previewLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(34,197,94,0.45)",
                                color: "#bbf7d0",
                                "&:hover": {
                                    borderColor: "rgba(34,197,94,0.75)",
                                    backgroundColor: "rgba(34,197,94,0.1)",
                                },
                            }}
                        >
                            {translate("Preview welcome", "Preview welcome")}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => handleAdminMailPreview("reset")}
                            disabled={previewLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(167,139,250,0.45)",
                                color: "#ddd6fe",
                                "&:hover": {
                                    borderColor: "rgba(167,139,250,0.75)",
                                    backgroundColor: "rgba(167,139,250,0.1)",
                                },
                            }}
                        >
                            {translate("Preview reset", "Preview reset")}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleAdminAthPreview}
                            disabled={previewLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(245,158,11,0.45)",
                                color: "#fde68a",
                                "&:hover": {
                                    borderColor: "rgba(245,158,11,0.75)",
                                    backgroundColor: "rgba(245,158,11,0.08)",
                                },
                            }}
                        >
                            {translate("Preview ATH", "Preview ATH")}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleAdminAthSendNow}
                            disabled={mailTestLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(251,191,36,0.5)",
                                color: "#fcd34d",
                                "&:hover": {
                                    borderColor: "rgba(251,191,36,0.8)",
                                    backgroundColor: "rgba(251,191,36,0.08)",
                                },
                            }}
                        >
                            {mailTestLoading
                                ? translate("Skickar ATH...", "Sending ATH...")
                                : translate("Skicka ATH nu", "Send ATH now")}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleAdminDailyAvgPreview}
                            disabled={previewLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(96,165,250,0.45)",
                                color: "#bfdbfe",
                                "&:hover": {
                                    borderColor: "rgba(96,165,250,0.75)",
                                    backgroundColor: "rgba(96,165,250,0.08)",
                                },
                            }}
                        >
                            {translate("Preview daily AVG", "Preview daily AVG")}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={handleAdminDailyAvgSendNow}
                            disabled={mailTestLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(14,165,233,0.5)",
                                color: "#7dd3fc",
                                "&:hover": {
                                    borderColor: "rgba(14,165,233,0.8)",
                                    backgroundColor: "rgba(14,165,233,0.1)",
                                },
                            }}
                        >
                            {mailTestLoading
                                ? translate("Skickar daily AVG...", "Sending daily AVG...")
                                : translate("Skicka daily AVG nu", "Send daily AVG now")}
                        </Button>
                    </Stack>
                </Stack>
            ) : null}

            {mailTestMessage ? (
                <Typography sx={{ color: "rgba(226,232,240,0.78)", textAlign: "center" }}>
                    {mailTestMessage}
                </Typography>
            ) : null}

            {adminPanel === "activity" ? (
                <Stack spacing={1} sx={{ width: "100%", maxWidth: 980, pt: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={loadAdminActivity}
                        disabled={adminActivityLoading}
                        sx={{
                            alignSelf: "center",
                            textTransform: "none",
                            borderColor: "rgba(148,163,184,0.35)",
                            color: "#e2e8f0",
                            "&:hover": {
                                borderColor: "rgba(148,163,184,0.55)",
                                backgroundColor: "rgba(148,163,184,0.08)",
                            },
                        }}
                    >
                        {adminActivityLoading
                            ? translate("Laddar aktivitet...", "Loading activity...")
                            : translate("Ladda om aktivitet", "Refresh activity")}
                    </Button>

                    {adminActivityError ? (
                        <Typography sx={{ color: statusColors.warning, textAlign: "center" }}>
                            {adminActivityError}
                        </Typography>
                    ) : null}

                    {adminActivityGeoSummary ? (
                        <Stack direction="row" spacing={1.5} justifyContent="center" flexWrap="wrap">
                            <Typography sx={{ color: "rgba(226,232,240,0.8)", fontSize: "0.9rem", fontWeight: 700 }}>
                                {translate(
                                    `SE: ${Number(adminActivityGeoSummary?.seActive || 0)}`,
                                    `SE: ${Number(adminActivityGeoSummary?.seActive || 0)}`
                                )}
                            </Typography>
                            <Typography sx={{ color: "rgba(226,232,240,0.8)", fontSize: "0.9rem", fontWeight: 700 }}>
                                {translate(
                                    `Utländska IP: ${Number(adminActivityGeoSummary?.foreignActive || 0)}`,
                                    `Foreign IPs: ${Number(adminActivityGeoSummary?.foreignActive || 0)}`
                                )}
                            </Typography>
                            <Typography sx={{ color: "rgba(226,232,240,0.8)", fontSize: "0.9rem", fontWeight: 700 }}>
                                {translate(
                                    `Okänt land: ${Number(adminActivityGeoSummary?.unknownCountryActive || 0)}`,
                                    `Unknown country: ${Number(adminActivityGeoSummary?.unknownCountryActive || 0)}`
                                )}
                            </Typography>
                            {Array.isArray(adminActivityGeoSummary?.byCountry) && adminActivityGeoSummary.byCountry.length ? (
                                <Typography sx={{ color: "rgba(226,232,240,0.7)", fontSize: "0.85rem" }}>
                                    {translate(
                                        `Toppländer: ${adminActivityGeoSummary.byCountry
                                            .slice(0, 5)
                                            .map((row) => `${row.country}:${row.count}`)
                                            .join(" · ")}`,
                                        `Top countries: ${adminActivityGeoSummary.byCountry
                                            .slice(0, 5)
                                            .map((row) => `${row.country}:${row.count}`)
                                            .join(" · ")}`
                                    )}
                                </Typography>
                            ) : null}
                        </Stack>
                    ) : null}

                    {adminActivityRows.length ? (
                        <Stack spacing={1}>
                            {adminActivityRows.map((row) => {
                                const name = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
                                const email = String(row?.email || "").trim();
                                const identity = name || email || "unknown";
                                const statusLabel = row?.isActive
                                    ? translate("Aktiv nu", "Active now")
                                    : translate("Inaktiv", "Inactive");
                                const whenLabel = row?.lastSeenAt
                                    ? new Date(row.lastSeenAt).toLocaleString(locale === "en" ? "en-GB" : "sv-SE")
                                    : "—";
                                const locationLabel = row?.lastPanel
                                    ? `${row?.lastPath || "/"} · ${row.lastPanel}`
                                    : row?.lastPath || "—";
                                return (
                                    <Box
                                        key={row?.email || identity}
                                        sx={{
                                            border: "1px solid rgba(148,163,184,0.22)",
                                            borderRadius: "12px",
                                            background: "rgba(15,23,42,0.45)",
                                            px: 1.4,
                                            py: 1.1,
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 2fr" },
                                            gap: 1,
                                        }}
                                    >
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
                                            <Typography
                                                sx={{
                                                    color: "#f8fafc",
                                                    fontWeight: 800,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                                                    <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {identity}
                                                    </Box>
                                                    {row?.hasHoldings ? (
                                                        <CheckCircleRounded sx={{ fontSize: 18, color: "#34d399", flexShrink: 0 }} />
                                                    ) : null}
                                                </Stack>
                                            </Typography>
                                            {email ? (
                                                <Typography
                                                    sx={{
                                                        color: "rgba(226,232,240,0.65)",
                                                        fontSize: "0.82rem",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {email}
                                                </Typography>
                                            ) : null}
                                        </Box>
                                        <Typography
                                            sx={{
                                                color: row?.isActive ? "#86efac" : "rgba(226,232,240,0.7)",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {statusLabel}
                                        </Typography>
                                        <Typography sx={{ color: "rgba(226,232,240,0.75)" }}>
                                            {translate("Senast", "Last")}: {whenLabel}
                                            {" • "}
                                            {translate("Vy", "View")}: {locationLabel}
                                            {" • "}
                                            {translate("Land", "Country")}: {row?.country || "??"}
                                            {" • "}
                                            {translate("IP", "IP")}: {row?.ipMasked || "—"}
                                        </Typography>
                                    </Box>
                                );
                            })}
                        </Stack>
                    ) : !adminActivityLoading ? (
                        <Typography sx={{ color: "rgba(226,232,240,0.7)", textAlign: "center" }}>
                            {translate("Ingen aktivitet ännu.", "No activity yet.")}
                        </Typography>
                    ) : null}
                </Stack>
            ) : null}

            {adminPanel === "users" ? (
                <Stack spacing={1} sx={{ width: "100%", maxWidth: 980, pt: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap">
                        <Typography sx={{ color: "#f8fafc", fontWeight: 700 }}>
                            {translate("Totalt registrerade", "Total registered")}: {adminUsersTotal}
                        </Typography>
                        <Button
                            variant="outlined"
                            onClick={loadAdminUsers}
                            disabled={adminUsersLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(148,163,184,0.35)",
                                color: "#e2e8f0",
                                "&:hover": {
                                    borderColor: "rgba(148,163,184,0.55)",
                                    backgroundColor: "rgba(148,163,184,0.08)",
                                },
                            }}
                        >
                            {adminUsersLoading
                                ? translate("Laddar användare...", "Loading users...")
                                : translate("Ladda om användare", "Refresh users")}
                        </Button>
                    </Stack>

                    <Stack direction="row" spacing={1} justifyContent="center" flexWrap="wrap">
                        <Typography sx={{ color: "rgba(226,232,240,0.78)", fontSize: "0.9rem", fontWeight: 700 }}>
                            {translate(
                                `ATH På/Av: ${athOnCount}/${athOffCount}`,
                                `ATH On/Off: ${athOnCount}/${athOffCount}`
                            )}
                        </Typography>
                        <Typography sx={{ color: "rgba(226,232,240,0.78)", fontSize: "0.9rem", fontWeight: 700 }}>
                            {translate(
                                `Daily AVG På/Av: ${dailyAvgOnCount}/${dailyAvgOffCount}`,
                                `Daily AVG On/Off: ${dailyAvgOnCount}/${dailyAvgOffCount}`
                            )}
                        </Typography>
                    </Stack>
                    <Stack
                        direction={{ xs: "column", md: "row" }}
                        spacing={1}
                        justifyContent="center"
                        alignItems={{ xs: "stretch", md: "center" }}
                    >
                        <TextField
                            placeholder={translate("Sök e-post...", "Search email...")}
                            value={adminUserEmailFilter}
                            onChange={(event) => setAdminUserEmailFilter(event.target.value)}
                            size="small"
                            sx={{
                                minWidth: { xs: "100%", md: 320 },
                                "& .MuiOutlinedInput-root": {
                                    backgroundColor: "rgba(2,6,23,0.2)",
                                    color: "#f8fafc",
                                    borderRadius: "10px",
                                    "& fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                                    "&:hover fieldset": { borderColor: "rgba(148,163,184,0.4)" },
                                    "&.Mui-focused fieldset": { borderColor: "rgba(56,189,248,0.55)" },
                                },
                            }}
                        />
                        <Button
                            variant="outlined"
                            onClick={() =>
                                openAdminPmDialog?.(
                                    exactEmailMatch || {
                                        email: normalizedUserEmailFilter,
                                        firstName: "",
                                        lastName: "",
                                    }
                                )
                            }
                            disabled={!normalizedUserEmailFilter || !normalizedUserEmailFilter.includes("@")}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(255,255,255,0.75)",
                                color: "#ffffff",
                                "&:hover": {
                                    borderColor: "#ffffff",
                                    backgroundColor: "rgba(255,255,255,0.08)",
                                },
                                "&.Mui-disabled": {
                                    opacity: 1,
                                    borderColor: "rgba(255,255,255,0.42)",
                                    color: "rgba(255,255,255,0.72)",
                                    backgroundColor: "rgba(255,255,255,0.06)",
                                },
                            }}
                        >
                            {translate("Skicka meddelande till sökt adress", "Send message to searched address")}
                        </Button>
                    </Stack>

                    {adminUsersError ? (
                        <Typography sx={{ color: statusColors.warning, textAlign: "center" }}>
                            {adminUsersError}
                        </Typography>
                    ) : null}

                    {filteredAdminUsers.length ? (
                        <Stack spacing={1}>
                            {filteredAdminUsers.map((row) => {
                                const name = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
                                const email = String(row?.email || "").trim();
                                const identity = name || email || "unknown";
                                const statusLabel = row?.isActive
                                    ? translate("Aktiv nu", "Active now")
                                    : translate("Inaktiv", "Inactive");
                                const whenLabel = row?.lastSeenAt
                                    ? new Date(row.lastSeenAt).toLocaleString(locale === "en" ? "en-GB" : "sv-SE")
                                    : translate("Aldrig", "Never");
                                const athLabel = row?.athEmailEnabled
                                    ? translate("ATH: På", "ATH: On")
                                    : translate("ATH: Av", "ATH: Off");
                                const dailyAvgLabel = row?.dailyAvgEmailEnabled
                                    ? translate("Daily AVG: På", "Daily AVG: On")
                                    : translate("Daily AVG: Av", "Daily AVG: Off");
                                return (
                                    <Box
                                        key={row?.email || identity}
                                        sx={{
                                            border: "1px solid rgba(148,163,184,0.22)",
                                            borderRadius: "12px",
                                            background: "rgba(15,23,42,0.45)",
                                            px: 1.4,
                                            py: 1.1,
                                            display: "grid",
                                            gridTemplateColumns: { xs: "1fr", md: "2fr 1fr 2fr" },
                                            gap: 1,
                                        }}
                                    >
                                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25, minWidth: 0 }}>
                                            <Typography
                                                sx={{
                                                    color: "#f8fafc",
                                                    fontWeight: 800,
                                                    overflow: "hidden",
                                                    textOverflow: "ellipsis",
                                                    whiteSpace: "nowrap",
                                                }}
                                            >
                                                <Stack direction="row" spacing={0.8} alignItems="center" sx={{ minWidth: 0 }}>
                                                    <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                                        {identity}
                                                    </Box>
                                                    {row?.hasHoldings ? (
                                                        <CheckCircleRounded sx={{ fontSize: 18, color: "#34d399", flexShrink: 0 }} />
                                                    ) : null}
                                                </Stack>
                                            </Typography>
                                            {email ? (
                                                <Typography
                                                    sx={{
                                                        color: "rgba(226,232,240,0.65)",
                                                        fontSize: "0.82rem",
                                                        overflow: "hidden",
                                                        textOverflow: "ellipsis",
                                                        whiteSpace: "nowrap",
                                                    }}
                                                >
                                                    {email}
                                                </Typography>
                                            ) : null}
                                        </Box>
                                        <Typography
                                            sx={{
                                                color: row?.isActive ? "#86efac" : "rgba(226,232,240,0.7)",
                                                fontWeight: 600,
                                            }}
                                        >
                                            {statusLabel}
                                        </Typography>
                                        <Stack spacing={0.25}>
                                            <Typography sx={{ color: "rgba(226,232,240,0.75)" }}>
                                                {translate("Senast online", "Last online")}: {whenLabel}
                                            </Typography>
                                            <Typography sx={{ color: "rgba(226,232,240,0.7)", fontSize: "0.82rem" }}>
                                                {athLabel}
                                                {" • "}
                                                {dailyAvgLabel}
                                            </Typography>
                                            <Typography sx={{ color: "rgba(226,232,240,0.7)", fontSize: "0.82rem" }}>
                                                {translate("PM olästa", "Unread PM")}: {Number(row?.pmUnreadCount || 0)}
                                            </Typography>
                                            {email ? (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => openAdminPmDialog?.(row)}
                                                    sx={{
                                                        mt: 0.4,
                                                        alignSelf: "flex-start",
                                                        textTransform: "none",
                                                        borderColor: "rgba(56,189,248,0.45)",
                                                        color: "#bae6fd",
                                                        "&:hover": {
                                                            borderColor: "rgba(56,189,248,0.7)",
                                                            backgroundColor: "rgba(56,189,248,0.1)",
                                                        },
                                                    }}
                                                >
                                                    {translate("Skicka meddelande", "Send message")}
                                                </Button>
                                            ) : null}
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    ) : !adminUsersLoading ? (
                        <Typography sx={{ color: "rgba(226,232,240,0.7)", textAlign: "center" }}>
                            {normalizedUserEmailFilter
                                ? translate("Ingen användare matchar e-postsökningen.", "No users match the email search.")
                                : translate("Inga användare ännu.", "No users yet.")}
                        </Typography>
                    ) : null}
                </Stack>
            ) : null}

            <Dialog
                open={Boolean(adminPmDialogOpen)}
                onClose={() => setAdminPmDialogOpen?.(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        background: "rgba(15,23,42,0.96)",
                        border: "1px solid rgba(148,163,184,0.2)",
                    },
                }}
            >
                <DialogTitle sx={{ color: "#f8fafc", fontWeight: 900 }}>
                    {translate("Skicka personligt meddelande", "Send personal message")}
                </DialogTitle>
                <DialogContent sx={{ pt: 1 }}>
                    <Stack spacing={1.2}>
                        <Typography sx={{ color: "rgba(226,232,240,0.78)", fontSize: "0.88rem" }}>
                            {translate("Mottagare (måste vara registrerad användare)", "Recipient (must be a registered user)")}: {adminPmRecipient?.email || "—"}
                        </Typography>
                        <TextField
                            label={translate("E-post att skicka till", "Email to send to")}
                            value={adminPmToEmail || ""}
                            onChange={(e) => setAdminPmToEmail?.(e.target.value)}
                            fullWidth
                            InputLabelProps={{ sx: { color: "rgba(226,232,240,0.75)" } }}
                            InputProps={{ sx: { color: "#f8fafc" } }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    backgroundColor: "rgba(2,6,23,0.15)",
                                    borderRadius: "12px",
                                    "& fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                                    "&:hover fieldset": { borderColor: "rgba(148,163,184,0.4)" },
                                    "&.Mui-focused fieldset": { borderColor: "rgba(56,189,248,0.55)" },
                                },
                            }}
                        />
                        <TextField
                            label={translate("Ämne", "Subject")}
                            value={adminPmSubject}
                            onChange={(e) => setAdminPmSubject?.(e.target.value)}
                            fullWidth
                            InputLabelProps={{ sx: { color: "rgba(226,232,240,0.75)" } }}
                            InputProps={{ sx: { color: "#f8fafc" } }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    backgroundColor: "rgba(2,6,23,0.15)",
                                    borderRadius: "12px",
                                    "& fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                                    "&:hover fieldset": { borderColor: "rgba(148,163,184,0.4)" },
                                    "&.Mui-focused fieldset": { borderColor: "rgba(56,189,248,0.55)" },
                                },
                            }}
                        />
                        <TextField
                            label={translate("Meddelande", "Message")}
                            value={adminPmMessage}
                            onChange={(e) => setAdminPmMessage?.(e.target.value)}
                            fullWidth
                            multiline
                            minRows={5}
                            InputLabelProps={{ sx: { color: "rgba(226,232,240,0.75)" } }}
                            InputProps={{ sx: { color: "#f8fafc" } }}
                            sx={{
                                "& .MuiOutlinedInput-root": {
                                    backgroundColor: "rgba(2,6,23,0.15)",
                                    borderRadius: "12px",
                                    "& fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                                    "&:hover fieldset": { borderColor: "rgba(148,163,184,0.4)" },
                                    "&.Mui-focused fieldset": { borderColor: "rgba(56,189,248,0.55)" },
                                },
                            }}
                        />
                        {adminPmStatus ? (
                            <Typography
                                sx={{
                                    color: adminPmStatus.toLowerCase().includes("skickat") ? "#86efac" : statusColors.warning,
                                    fontSize: "0.85rem",
                                }}
                            >
                                {adminPmStatus}
                            </Typography>
                        ) : null}
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 2.4, pb: 2 }}>
                    <Button
                        variant="outlined"
                        onClick={() => setAdminPmDialogOpen?.(false)}
                        sx={{
                            textTransform: "none",
                            borderColor: "rgba(148,163,184,0.35)",
                            color: "#e2e8f0",
                        }}
                    >
                        {translate("Stäng", "Close")}
                    </Button>
                    <Button
                        variant="outlined"
                        onClick={() => applyAdminDonationTemplate?.()}
                        sx={{
                            textTransform: "none",
                            borderColor: "rgba(34,197,94,0.45)",
                            color: "#bbf7d0",
                            "&:hover": {
                                borderColor: "rgba(34,197,94,0.7)",
                                backgroundColor: "rgba(34,197,94,0.08)",
                            },
                        }}
                    >
                        {translate("Ladda tackmall", "Load thank-you template")}
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => sendAdminPm?.()}
                        disabled={Boolean(adminPmSending)}
                        sx={{
                            textTransform: "none",
                            background: "linear-gradient(135deg, rgba(56,189,248,0.55), rgba(59,130,246,0.55))",
                            border: "1px solid rgba(191,219,254,0.28)",
                        }}
                    >
                        {adminPmSending
                            ? translate("Skickar...", "Sending...")
                            : translate("Skicka meddelande", "Send message")}
                    </Button>
                </DialogActions>
            </Dialog>

            {adminPanel === "support" ? (
                <Stack spacing={1} sx={{ width: "100%", maxWidth: 980, pt: 1 }}>
                    <Stack direction="row" spacing={1} alignItems="center" justifyContent="center" flexWrap="wrap">
                        <Button
                            variant="outlined"
                            onClick={loadAdminSupport}
                            disabled={adminSupportLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(148,163,184,0.35)",
                                color: "#e2e8f0",
                                "&:hover": {
                                    borderColor: "rgba(148,163,184,0.55)",
                                    backgroundColor: "rgba(148,163,184,0.08)",
                                },
                            }}
                        >
                            {adminSupportLoading
                                ? translate("Laddar support...", "Loading support...")
                                : translate("Ladda om support", "Refresh support")}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => createDemoSupportTicket("open")}
                            disabled={adminSupportLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(245,158,11,0.35)",
                                color: "#fde68a",
                                "&:hover": {
                                    borderColor: "rgba(245,158,11,0.6)",
                                    backgroundColor: "rgba(245,158,11,0.08)",
                                },
                            }}
                        >
                            {translate("Skapa demo (öppen)", "Create demo (open)")}
                        </Button>
                        <Button
                            variant="outlined"
                            onClick={() => createDemoSupportTicket("answered")}
                            disabled={adminSupportLoading}
                            sx={{
                                textTransform: "none",
                                borderColor: "rgba(34,197,94,0.35)",
                                color: "#bbf7d0",
                                "&:hover": {
                                    borderColor: "rgba(34,197,94,0.6)",
                                    backgroundColor: "rgba(34,197,94,0.08)",
                                },
                            }}
                        >
                            {translate("Skapa demo (besvarad)", "Create demo (answered)")}
                        </Button>
                    </Stack>

                    {adminSupportError ? (
                        <Typography sx={{ color: statusColors.warning, textAlign: "center" }}>
                            {adminSupportError}
                        </Typography>
                    ) : null}

                    {adminSupportRows.length ? (
                        <Stack spacing={1}>
                            {adminSupportRows.map((row) => {
                                const name = [row?.firstName, row?.lastName].filter(Boolean).join(" ").trim();
                                const email = String(row?.email || "").trim();
                                const identity = name || (email ? email.split("@")[0] : "") || "unknown";
                                const whenLabel = row?.updatedAt
                                    ? new Date(row.updatedAt).toLocaleString(locale === "en" ? "en-GB" : "sv-SE")
                                    : "—";
                                const statusColor =
                                    row?.status === "answered"
                                        ? "#86efac"
                                        : row?.status === "closed"
                                            ? "rgba(226,232,240,0.7)"
                                            : "#fde68a";
                                const statusLabel =
                                    row?.status === "answered"
                                        ? translate("Besvarad", "Answered")
                                        : row?.status === "closed"
                                            ? translate("Stängd", "Closed")
                                            : translate("Öppen", "Open");
                                return (
                                    <Button
                                        key={row?.id}
                                        variant="outlined"
                                        onClick={() => openAdminSupportTicket(row?.id)}
                                        sx={{
                                            textTransform: "none",
                                            justifyContent: "space-between",
                                            borderColor: "rgba(148,163,184,0.22)",
                                            color: "#e2e8f0",
                                            borderRadius: "12px",
                                            py: 1.1,
                                            px: 1.4,
                                            "&:hover": { borderColor: "rgba(148,163,184,0.38)", backgroundColor: "rgba(148,163,184,0.06)" },
                                        }}
                                    >
                                        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 0.2, minWidth: 0 }}>
                                            <Typography sx={{ color: "#f8fafc", fontWeight: 900 }}>
                                                {row?.subject || translate("Support ticket", "Support ticket")}
                                            </Typography>
                                            <Typography sx={{ color: "rgba(226,232,240,0.65)", fontSize: "0.82rem" }}>
                                                {identity}
                                                {" • "}
                                                {translate("Uppdaterad", "Updated")}: {whenLabel}
                                            </Typography>
                                        </Box>
                                        <Typography sx={{ fontWeight: 900, color: statusColor }}>{statusLabel}</Typography>
                                    </Button>
                                );
                            })}
                        </Stack>
                    ) : !adminSupportLoading ? (
                        <Typography sx={{ color: "rgba(226,232,240,0.7)", textAlign: "center" }}>
                            {translate("Inga support tickets ännu.", "No support tickets yet.")}
                        </Typography>
                    ) : null}
                </Stack>
            ) : null}

            {adminPanel === "cost" ? (
                <Stack spacing={1} sx={{ width: "100%", maxWidth: 980, pt: 1 }}>
                    <Button
                        variant="outlined"
                        onClick={loadAdminCost}
                        disabled={adminCostLoading}
                        sx={{
                            alignSelf: "center",
                            textTransform: "none",
                            borderColor: "rgba(14,165,233,0.45)",
                            color: "#bae6fd",
                            "&:hover": {
                                borderColor: "rgba(14,165,233,0.75)",
                                backgroundColor: "rgba(14,165,233,0.08)",
                            },
                        }}
                    >
                        {adminCostLoading
                            ? translate("Laddar kostnadsdata...", "Loading cost data...")
                            : translate("Ladda om kostnadsdata", "Refresh cost data")}
                    </Button>

                    {adminCostError ? (
                        <Typography sx={{ color: statusColors.warning, textAlign: "center" }}>
                            {adminCostError}
                        </Typography>
                    ) : null}

                    {adminCostData?.totals ? (
                        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap" justifyContent="center">
                            <Typography sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                {translate("Request 72h", "Requests 72h")}: {Number(adminCostData?.totals?.totalRequests || 0)}
                            </Typography>
                            <Typography sx={{ color: "rgba(226,232,240,0.85)", fontWeight: 700 }}>
                                {translate("Cron request", "Cron requests")}: {Number(adminCostData?.totals?.cronRequests || 0)}
                            </Typography>
                            <Typography sx={{ color: "rgba(187,247,208,0.95)", fontWeight: 700 }}>
                                {translate("Sparade samples", "Saved samples")}: {Number(adminCostData?.totals?.sampleWrites || 0)}
                            </Typography>
                            <Typography sx={{ color: "rgba(191,219,254,0.95)", fontWeight: 700 }}>
                                {translate("Undvikna sample-writes", "Avoided sample writes")}: {Number(adminCostData?.totals?.sampleWriteAvoided || 0)}
                            </Typography>
                            <Typography sx={{ color: "rgba(226,232,240,0.75)", fontWeight: 700 }}>
                                {translate("Hourly-jämförelse anrop", "Hourly comparison calls")}: {Number(adminCostData?.totals?.includeHourlyRequests || 0)}
                            </Typography>
                        </Stack>
                    ) : null}

                    {Array.isArray(adminCostData?.endpoints) && adminCostData.endpoints.length ? (
                        <Stack spacing={0.8}>
                            <Typography sx={{ color: "rgba(226,232,240,0.82)", textAlign: "center", fontWeight: 800 }}>
                                {translate("Top endpoints (72h)", "Top endpoints (72h)")}
                            </Typography>
                            {adminCostData.endpoints.slice(0, 6).map((row) => (
                                <Box
                                    key={row.endpoint}
                                    sx={{
                                        border: "1px solid rgba(148,163,184,0.22)",
                                        borderRadius: "12px",
                                        background: "rgba(15,23,42,0.45)",
                                        px: 1.4,
                                        py: 1.05,
                                        display: "flex",
                                        justifyContent: "space-between",
                                        gap: 1,
                                    }}
                                >
                                    <Typography sx={{ color: "#e2e8f0", fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
                                        {row.endpoint}
                                    </Typography>
                                    <Typography sx={{ color: "#f8fafc", fontWeight: 800 }}>
                                        {Number(row.requests || 0)}
                                    </Typography>
                                </Box>
                            ))}
                        </Stack>
                    ) : null}

                    {Array.isArray(adminCostData?.notes) && adminCostData.notes.length ? (
                        <Stack spacing={0.4}>
                            {adminCostData.notes.map((note, idx) => (
                                <Typography key={`${idx}-${note}`} sx={{ color: "rgba(226,232,240,0.6)", textAlign: "center", fontSize: "0.82rem" }}>
                                    {note}
                                </Typography>
                            ))}
                        </Stack>
                    ) : null}
                </Stack>
            ) : null}
        </Stack>
    );
}
