
import {
    Dialog,
    DialogTitle,
    DialogContent,
    Stack,
    Alert,
    TextField,
    Button
} from "@mui/material";

export function PasswordDialog({
    open,
    onClose,
    translate,
    currentPassword, setCurrentPassword,
    newPassword, setNewPassword,
    confirmPassword, setConfirmPassword,
    passwordError,
    passwordSuccess,
    passwordLoading,
    onSubmit
}) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="xs"
            PaperProps={{
                sx: {
                    background: "rgba(15,23,42,0.96)",
                    border: "1px solid rgba(148,163,184,0.2)",
                },
            }}
        >
            <DialogTitle sx={{ color: "#f8fafc", fontWeight: 700 }}>
                {translate("Byt lösenord", "Change password")}
            </DialogTitle>
            <DialogContent>
                <Stack spacing={1.6} sx={{ mt: 0.5 }}>
                    {passwordError ? <Alert severity="error">{passwordError}</Alert> : null}
                    {passwordSuccess ? <Alert severity="success">{passwordSuccess}</Alert> : null}
                    <TextField
                        type="password"
                        label={translate("Nuvarande lösenord", "Current password")}
                        value={currentPassword}
                        onChange={(event) => setCurrentPassword(event.target.value)}
                        fullWidth
                        sx={{
                            "& .MuiInputBase-input": { color: "#f8fafc" },
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.35)" },
                        }}
                        InputLabelProps={{ sx: { color: "rgba(226,232,240,0.7)" } }}
                    />
                    <TextField
                        type="password"
                        label={translate("Nytt lösenord", "New password")}
                        value={newPassword}
                        onChange={(event) => setNewPassword(event.target.value)}
                        fullWidth
                        sx={{
                            "& .MuiInputBase-input": { color: "#f8fafc" },
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.35)" },
                        }}
                        InputLabelProps={{ sx: { color: "rgba(226,232,240,0.7)" } }}
                    />
                    <TextField
                        type="password"
                        label={translate("Bekräfta nytt lösenord", "Confirm new password")}
                        value={confirmPassword}
                        onChange={(event) => setConfirmPassword(event.target.value)}
                        fullWidth
                        sx={{
                            "& .MuiInputBase-input": { color: "#f8fafc" },
                            "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.35)" },
                        }}
                        InputLabelProps={{ sx: { color: "rgba(226,232,240,0.7)" } }}
                    />
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <Button
                            variant="text"
                            onClick={onClose}
                            sx={{ color: "rgba(226,232,240,0.75)", textTransform: "none" }}
                        >
                            {translate("Stäng", "Close")}
                        </Button>
                        <Button
                            variant="contained"
                            onClick={onSubmit}
                            disabled={passwordLoading}
                            sx={{
                                textTransform: "none",
                                fontWeight: 700,
                                color: "#e0f2fe",
                                background: "linear-gradient(135deg, rgba(37,99,235,0.78), rgba(14,165,233,0.72))",
                                border: "1px solid rgba(125,211,252,0.32)",
                                "&:hover": {
                                    background: "linear-gradient(135deg, rgba(59,130,246,0.82), rgba(34,211,238,0.76))",
                                },
                            }}
                        >
                            {passwordLoading ? translate("Sparar...", "Saving...") : translate("Uppdatera lösenord", "Update password")}
                        </Button>
                    </Stack>
                </Stack>
            </DialogContent>
        </Dialog>
    );
}
