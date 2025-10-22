"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { resetPassword, authDisabled } = useAuth();

  const email = searchParams?.get("email") ?? "";
  const token = searchParams?.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (authDisabled) {
      router.replace("/");
    }
  }, [authDisabled, router]);

  if (authDisabled) {
    return null;
  }

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (password !== confirmPassword) {
      setError("Lösenorden matchar inte.");
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword({ email, token, newPassword: password });
      setSuccess("Ditt lösenord är uppdaterat. Du kan nu logga in med ditt nya lösenord.");
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setError(err?.message || "Kunde inte återställa lösenordet. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  const missingParams = !email || !token;

  return (
    <Container
      maxWidth="sm"
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "80vh",
      }}
    >
      <Paper
        elevation={6}
        sx={{
          width: "100%",
          padding: { xs: 3, sm: 5 },
          borderRadius: 3,
          background: "linear-gradient(135deg, rgba(20,20,20,0.95), rgba(40,40,40,0.95))",
          border: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <Box component="header" sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: "#fff" }}>
            Återställ lösenord
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 1 }}>
            Ange ett nytt lösenord för ditt konto.
          </Typography>
        </Box>

        {missingParams ? (
          <Box sx={{ textAlign: "center" }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              Länken verkar ogiltig. Försök igen genom att begära ett nytt mail.
            </Alert>
            <Button variant="contained" onClick={() => router.push("/login")}>
              Tillbaka till inloggning
            </Button>
          </Box>
        ) : (
          <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2.5 }}>
            {error && (
              <Alert severity="error" onClose={() => setError("")}>
                {error}
              </Alert>
            )}
            {success && (
              <Alert severity="success" onClose={() => setSuccess("")}>
                {success}
              </Alert>
            )}

            <TextField
              label="E-post"
              value={email}
              disabled
              fullWidth
              InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
              InputProps={{ sx: { color: "rgba(255,255,255,0.6)" } }}
            />

            <TextField
              label="Nytt lösenord"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
              fullWidth
              InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
              InputProps={{ sx: { color: "#fff" } }}
            />

            <TextField
              label="Bekräfta nytt lösenord"
              type="password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              autoComplete="new-password"
              required
              fullWidth
              InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
              InputProps={{ sx: { color: "#fff" } }}
            />

            <Button
              type="submit"
              variant="contained"
              disabled={submitting}
              sx={{
                mt: 1,
                py: 1.4,
                fontWeight: 600,
                background: "linear-gradient(135deg, #4a90e2, #0077ff)",
              }}
            >
              {submitting ? "Uppdaterar..." : "Uppdatera lösenord"}
            </Button>

            <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)", textAlign: "center" }}>
              Tillbaka till{" "}
              <Link component={NextLink} href="/login" underline="hover" sx={{ color: "#4a90e2" }}>
                inloggning
              </Link>
            </Typography>
          </Box>
        )}
      </Paper>
    </Container>
  );
}
