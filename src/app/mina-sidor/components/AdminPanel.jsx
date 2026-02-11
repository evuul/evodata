import {
    Box,
    Button,
    Stack,
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
    handleAdminDailyAvgPreview,
    handleAdminDailyAvgSendNow,
    loadAdminActivity,
    loadAdminUsers,
    loadAdminSupport,
    createDemoSupportTicket,
    openAdminSupportTicket,
    saveAlertsSettings,
    // State
    mailTestLoading,
    mailTestMessage,
    previewLoading,
    adminActivityLoading,
    adminActivityError,
    adminActivityRows,
    adminUsersLoading,
    adminUsersError,
    adminUsersRows,
    adminUsersTotal,
    adminSupportLoading,
    adminSupportError,
    adminSupportRows,
    alertsSettingsLoading,
    alertsSettingsError,
    alertsTestOnlyAdmin,
    alertsAthEnabled,
    alertsDailyAvgEnabled,
    profileIdentity,
    user
}) {
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
                                borderColor: "rgba(56,189,248,0.45)",
                                color: "#bae6fd",
                                "&:hover": {
                                    borderColor: "rgba(56,189,248,0.7)",
                                    backgroundColor: "rgba(56,189,248,0.1)",
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

                    {adminUsersError ? (
                        <Typography sx={{ color: statusColors.warning, textAlign: "center" }}>
                            {adminUsersError}
                        </Typography>
                    ) : null}

                    {adminUsersRows.length ? (
                        <Stack spacing={1}>
                            {adminUsersRows.map((row) => {
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
                                        </Stack>
                                    </Box>
                                );
                            })}
                        </Stack>
                    ) : !adminUsersLoading ? (
                        <Typography sx={{ color: "rgba(226,232,240,0.7)", textAlign: "center" }}>
                            {translate("Inga användare ännu.", "No users yet.")}
                        </Typography>
                    ) : null}
                </Stack>
            ) : null}

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
        </Stack>
    );
}
