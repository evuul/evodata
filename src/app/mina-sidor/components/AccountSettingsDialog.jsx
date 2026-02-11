"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";

const inputSx = {
  "& .MuiInputBase-input": { color: "#f8fafc" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "rgba(148,163,184,0.35)" },
};

const inputLabelSx = { color: "rgba(226,232,240,0.7)" };

export function AccountSettingsDialog({
  open,
  onClose,
  translate,
  email,
  firstName,
  lastName,
  onSaveProfile,
  onChangePassword,
  onDeleteAccount,
}) {
  const [tab, setTab] = useState("profile");

  const [profileFirstName, setProfileFirstName] = useState("");
  const [profileLastName, setProfileLastName] = useState("");
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState("");
  const [profileSuccess, setProfileSuccess] = useState("");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");

  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  useEffect(() => {
    if (!open) return;
    setTab("profile");
    setProfileFirstName(String(firstName || ""));
    setProfileLastName(String(lastName || ""));
    setProfileError("");
    setProfileSuccess("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordError("");
    setPasswordSuccess("");
    setDeletePassword("");
    setDeleteConfirmation("");
    setDeleteError("");
  }, [open, firstName, lastName]);

  const handleSaveProfile = async () => {
    const nextFirst = String(profileFirstName || "").trim();
    const nextLast = String(profileLastName || "").trim();
    if (!nextFirst || !nextLast) {
      setProfileError(translate("Förnamn och efternamn krävs.", "First and last name are required."));
      return;
    }
    try {
      setProfileLoading(true);
      setProfileError("");
      setProfileSuccess("");
      await onSaveProfile?.({ firstName: nextFirst, lastName: nextLast });
      setProfileSuccess(translate("Profilen uppdaterades.", "Profile updated."));
    } catch (err) {
      setProfileError(err?.message || translate("Kunde inte uppdatera profil.", "Could not update profile."));
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError(translate("Fyll i alla fält.", "Fill in all fields."));
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError(translate("Nytt lösenord måste vara minst 8 tecken.", "New password must be at least 8 characters."));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(translate("Lösenorden matchar inte.", "Passwords do not match."));
      return;
    }
    try {
      setPasswordLoading(true);
      setPasswordError("");
      setPasswordSuccess("");
      await onChangePassword?.({ currentPassword, newPassword });
      setPasswordSuccess(translate("Lösenordet är uppdaterat.", "Password updated."));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      setPasswordError(err?.message || translate("Kunde inte uppdatera lösenord.", "Could not update password."));
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword || !deleteConfirmation) {
      setDeleteError(translate("Fyll i lösenord och bekräftelse.", "Enter password and confirmation."));
      return;
    }
    try {
      setDeleteLoading(true);
      setDeleteError("");
      await onDeleteAccount?.({ currentPassword: deletePassword, confirmation: deleteConfirmation });
    } catch (err) {
      setDeleteError(err?.message || translate("Kunde inte radera kontot.", "Could not delete account."));
      setDeleteLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="sm"
      PaperProps={{
        sx: {
          background: "rgba(15,23,42,0.96)",
          border: "1px solid rgba(148,163,184,0.2)",
        },
      }}
    >
      <DialogTitle sx={{ color: "#f8fafc", fontWeight: 800 }}>
        {translate("Inställningar", "Settings")}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.8}>
          <Tabs
            value={tab}
            onChange={(_, value) => setTab(value)}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: "rgba(56,189,248,0.9)" } }}
            sx={{
              "& .MuiTab-root": {
                color: "rgba(226,232,240,0.75)",
                textTransform: "none",
                fontWeight: 700,
              },
              "& .Mui-selected": { color: "#e0f2fe!important" },
            }}
          >
            <Tab value="profile" label={translate("Profil", "Profile")} />
            <Tab value="password" label={translate("Lösenord", "Password")} />
            <Tab value="danger" label={translate("Radera konto", "Delete account")} />
          </Tabs>

          {tab === "profile" ? (
            <Stack spacing={1.2}>
              {profileError ? <Alert severity="error">{profileError}</Alert> : null}
              {profileSuccess ? <Alert severity="success">{profileSuccess}</Alert> : null}
              <TextField
                label={translate("Förnamn", "First name")}
                value={profileFirstName}
                onChange={(event) => setProfileFirstName(event.target.value)}
                fullWidth
                sx={inputSx}
                InputLabelProps={{ sx: inputLabelSx }}
              />
              <TextField
                label={translate("Efternamn", "Last name")}
                value={profileLastName}
                onChange={(event) => setProfileLastName(event.target.value)}
                fullWidth
                sx={inputSx}
                InputLabelProps={{ sx: inputLabelSx }}
              />
              <TextField
                label="Email"
                value={email || ""}
                fullWidth
                InputProps={{ readOnly: true }}
                sx={inputSx}
                InputLabelProps={{ sx: inputLabelSx }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  onClick={handleSaveProfile}
                  disabled={profileLoading}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#e0f2fe",
                    background: "linear-gradient(135deg, rgba(37,99,235,0.78), rgba(14,165,233,0.72))",
                  }}
                >
                  {profileLoading ? translate("Sparar...", "Saving...") : translate("Spara profil", "Save profile")}
                </Button>
              </Box>
            </Stack>
          ) : null}

          {tab === "password" ? (
            <Stack spacing={1.2}>
              {passwordError ? <Alert severity="error">{passwordError}</Alert> : null}
              {passwordSuccess ? <Alert severity="success">{passwordSuccess}</Alert> : null}
              <TextField
                type="password"
                label={translate("Nuvarande lösenord", "Current password")}
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                fullWidth
                sx={inputSx}
                InputLabelProps={{ sx: inputLabelSx }}
              />
              <TextField
                type="password"
                label={translate("Nytt lösenord", "New password")}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                fullWidth
                sx={inputSx}
                InputLabelProps={{ sx: inputLabelSx }}
              />
              <TextField
                type="password"
                label={translate("Bekräfta nytt lösenord", "Confirm new password")}
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                fullWidth
                sx={inputSx}
                InputLabelProps={{ sx: inputLabelSx }}
              />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  onClick={handleChangePassword}
                  disabled={passwordLoading}
                  sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    color: "#e0f2fe",
                    background: "linear-gradient(135deg, rgba(37,99,235,0.78), rgba(14,165,233,0.72))",
                  }}
                >
                  {passwordLoading ? translate("Sparar...", "Saving...") : translate("Uppdatera lösenord", "Update password")}
                </Button>
              </Box>
            </Stack>
          ) : null}

          {tab === "danger" ? (
            <Stack spacing={1.2}>
              {deleteError ? <Alert severity="error">{deleteError}</Alert> : null}
              <Alert severity="warning">
                {translate(
                  "Det här tar bort ditt konto permanent. För att bekräfta: skriv ditt lösenord och din e-postadress.",
                  "This permanently deletes your account. To confirm: enter your password and your email address."
                )}
              </Alert>
              <Typography sx={{ color: "rgba(226,232,240,0.75)", fontSize: "0.9rem" }}>
                {translate("Bekräftelse kräver exakt e-post:", "Confirmation requires exact email:")}{" "}
                <strong>{email || "—"}</strong>
              </Typography>
              <TextField
                type="password"
                label={translate("Nuvarande lösenord", "Current password")}
                value={deletePassword}
                onChange={(event) => setDeletePassword(event.target.value)}
                fullWidth
                sx={inputSx}
                InputLabelProps={{ sx: inputLabelSx }}
              />
              <TextField
                label={translate("Skriv din e-post för att bekräfta", "Type your email to confirm")}
                value={deleteConfirmation}
                onChange={(event) => setDeleteConfirmation(event.target.value)}
                fullWidth
                sx={inputSx}
                InputLabelProps={{ sx: inputLabelSx }}
              />
              <Divider sx={{ borderColor: "rgba(248,113,113,0.22)" }} />
              <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDeleteAccount}
                  disabled={deleteLoading}
                  sx={{ textTransform: "none", fontWeight: 800 }}
                >
                  {deleteLoading ? translate("Raderar konto...", "Deleting account...") : translate("Radera mitt konto", "Delete my account")}
                </Button>
              </Box>
            </Stack>
          ) : null}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}
