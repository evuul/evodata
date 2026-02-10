
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
    Typography,
    Box,
    Divider,
    TextField,
    Button
} from "@mui/material";
import { buttonStyles } from "@/Components/MinaSidor/styles";

export function AdminDialogs({
    previewOpen, setPreviewOpen, previewTitle, previewHtml,
    adminSupportDialogOpen, setAdminSupportDialogOpen,
    adminSupportSelected, adminSupportReply, setAdminSupportReply,
    adminSupportReplyLoading, saveAdminSupportReply, closeAdminSupportTicket,
    translate
}) {
    return (
        <>
            {/* Preview Dialog */}
            <Dialog
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                fullWidth
                maxWidth="lg"
                PaperProps={{
                    sx: {
                        background: "rgba(15,23,42,0.96)",
                        border: "1px solid rgba(148,163,184,0.2)",
                        height: { xs: "92vh", md: "90vh" },
                        maxHeight: { xs: "92vh", md: "90vh" },
                    },
                }}
            >
                <DialogTitle sx={{ color: "#f8fafc", fontWeight: 700 }}>{previewTitle}</DialogTitle>
                <DialogContent sx={{ pt: 0.5, height: "100%" }}>
                    <Box
                        sx={{
                            background: "#0b1220",
                            borderRadius: 2,
                            border: "1px solid rgba(148,163,184,0.2)",
                            p: 1,
                            height: "100%",
                        }}
                    >
                        <iframe
                            title="mail-preview"
                            srcDoc={previewHtml}
                            style={{
                                width: "100%",
                                height: "100%",
                                minHeight: "70vh",
                                border: 0,
                                borderRadius: "8px",
                                background: "#0b1220",
                            }}
                        />
                    </Box>
                </DialogContent>
            </Dialog>

            {/* Admin Support Dialog */}
            <Dialog
                open={adminSupportDialogOpen}
                onClose={() => setAdminSupportDialogOpen(false)}
                fullWidth
                maxWidth="md"
                PaperProps={{
                    sx: {
                        background: "rgba(15,23,42,0.96)",
                        border: "1px solid rgba(148,163,184,0.2)",
                    },
                }}
            >
                <DialogTitle sx={{ color: "#f8fafc", fontWeight: 900 }}>
                    {translate("Support ticket", "Support ticket")}
                </DialogTitle>
                <DialogContent sx={{ pt: 0.5 }}>
                    {adminSupportSelected ? (
                        <Stack spacing={1.4}>
                            <Typography sx={{ color: "#f8fafc", fontWeight: 900 }}>{adminSupportSelected.subject}</Typography>
                            <Typography sx={{ color: "rgba(226,232,240,0.7)", fontWeight: 700, fontSize: "0.85rem" }}>
                                {[
                                    adminSupportSelected.firstName,
                                    adminSupportSelected.lastName,
                                ]
                                    .filter(Boolean)
                                    .join(" ")
                                    .trim() ||
                                    String(adminSupportSelected.email || "")
                                        .split("@")[0]
                                        .trim()}
                                {" • "}
                                {translate("Status", "Status")}: {String(adminSupportSelected.status || "")}
                            </Typography>
                            <Box
                                sx={{
                                    border: "1px solid rgba(148,163,184,0.18)",
                                    borderRadius: "12px",
                                    background: "rgba(15,23,42,0.45)",
                                    p: 1.4,
                                }}
                            >
                                <Typography sx={{ color: "rgba(226,232,240,0.9)", whiteSpace: "pre-wrap" }}>
                                    {adminSupportSelected.message}
                                </Typography>
                            </Box>

                            <Divider sx={{ borderColor: "rgba(148,163,184,0.18)" }} />

                            <TextField
                                label={translate("Svar", "Reply")}
                                value={adminSupportReply}
                                onChange={(e) => setAdminSupportReply(e.target.value)}
                                fullWidth
                                multiline
                                minRows={4}
                                InputLabelProps={{ sx: { color: "rgba(226,232,240,0.75)" } }}
                                InputProps={{ sx: { color: "#f8fafc" } }}
                                sx={{
                                    "& .MuiOutlinedInput-root": {
                                        backgroundColor: "rgba(2,6,23,0.15)",
                                        borderRadius: "12px",
                                        "& fieldset": { borderColor: "rgba(148,163,184,0.25)" },
                                        "&:hover fieldset": { borderColor: "rgba(148,163,184,0.4)" },
                                        "&.Mui-focused fieldset": { borderColor: "rgba(245,158,11,0.55)" },
                                    },
                                }}
                            />

                            <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap">
                                <Button
                                    variant="outlined"
                                    onClick={closeAdminSupportTicket}
                                    disabled={adminSupportReplyLoading}
                                    sx={{
                                        textTransform: "none",
                                        borderColor: "rgba(148,163,184,0.35)",
                                        color: "#e2e8f0",
                                        "&:hover": { borderColor: "rgba(148,163,184,0.55)", backgroundColor: "rgba(148,163,184,0.08)" },
                                    }}
                                >
                                    {translate("Stäng ticket", "Close ticket")}
                                </Button>
                                <Button
                                    variant="contained"
                                    onClick={saveAdminSupportReply}
                                    disabled={adminSupportReplyLoading}
                                    sx={{
                                        ...buttonStyles.primary,
                                        px: 2.2,
                                        py: 1.1,
                                        background: "linear-gradient(135deg, rgba(245,158,11,0.55), rgba(249,115,22,0.55))",
                                        border: "1px solid rgba(253,230,138,0.25)",
                                        "&:hover": {
                                            background: "linear-gradient(135deg, rgba(245,158,11,0.7), rgba(249,115,22,0.65))",
                                        },
                                    }}
                                >
                                    {translate("Spara svar", "Save reply")}
                                </Button>
                            </Stack>
                        </Stack>
                    ) : (
                        <Typography sx={{ color: "rgba(226,232,240,0.7)" }}>
                            {adminSupportReplyLoading ? translate("Laddar...", "Loading...") : "—"}
                        </Typography>
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}
