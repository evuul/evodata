"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Link,
  Paper,
  TextField,
  Typography,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";

const AUTH_DISABLED_FLAG = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, requestPasswordReset, isAuthenticated, initialized, authDisabled } = useAuth();

  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  useEffect(() => {
    if (authDisabled) {
      router.replace("/");
    }
  }, [authDisabled, router]);

  useEffect(() => {
    if (initialized && isAuthenticated) {
      const next = searchParams?.get("next");
      router.replace(next || "/");
    }
  }, [initialized, isAuthenticated, router, searchParams]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      await login({ email: form.email.trim(), password: form.password });
      const next = searchParams?.get("next");
      router.replace(next || "/");
    } catch (err) {
      setError(err?.message || "Något gick fel. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenReset = () => {
    setResetEmail(form.email.trim());
    setResetDialogOpen(true);
    setResetError("");
    setResetSuccess("");
  };

  const handleCloseReset = () => {
    setResetDialogOpen(false);
    setResetSubmitting(false);
    setResetError("");
    setResetSuccess("");
  };

  const handleResetPassword = async (event) => {
    event.preventDefault();
    setResetError("");
    setResetSuccess("");
    setResetSubmitting(true);
    try {
      const resetUrlBase =
        typeof window !== "undefined"
          ? `${window.location.origin}/reset-password`
          : "/reset-password";
      await requestPasswordReset({ email: resetEmail.trim(), resetUrlBase });
      setResetSuccess(
        "Om e-postadressen finns registrerad skickar vi en återställningslänk inom kort."
      );
    } catch (err) {
      setResetError(err?.message || "Kunde inte skicka återställningslänken. Försök igen.");
    } finally {
      setResetSubmitting(false);
    }
  };

  const handleSkipLogin = () => {
    const next = searchParams?.get("next");
    router.push(next || "/");
  };

  if (!initialized && !isAuthenticated) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "70vh",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (authDisabled) {
    return null;
  }

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
            Logga in
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 1 }}>
            Ange dina uppgifter för att fortsätta.
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2.5 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <TextField
            label="E-post"
            name="email"
            type="email"
            value={form.email}
            onChange={handleChange}
            autoComplete="email"
            required
            fullWidth
            InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
            InputProps={{ sx: { color: "#fff" } }}
          />

          <TextField
            label="Lösenord"
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            autoComplete="current-password"
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
            {submitting ? "Loggar in..." : "Logga in"}
          </Button>
        </Box>

        <Box sx={{ mt: 2, textAlign: "center" }}>
          <Link
            component="button"
            type="button"
            onClick={handleOpenReset}
            underline="hover"
            sx={{ color: "#4a90e2", fontWeight: 500 }}
          >
            Glömt ditt lösenord?
          </Link>
        </Box>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
            Inget konto än?{" "}
            <Link component={NextLink} href="/register" underline="hover" sx={{ color: "#4a90e2" }}>
              Registrera dig här
            </Link>
          </Typography>
        </Box>

        <Box sx={{ mt: 3, display: "flex", justifyContent: "center" }}>
          <Button
            type="button"
            variant="outlined"
            onClick={handleSkipLogin}
            sx={{
              color: "#4a90e2",
              borderColor: "rgba(74, 144, 226, 0.6)",
              "&:hover": {
                borderColor: "#4a90e2",
                backgroundColor: "rgba(74, 144, 226, 0.08)",
              },
            }}
          >
            Gå vidare utan att logga in
          </Button>
        </Box>
      </Paper>

      <Dialog open={resetDialogOpen} onClose={handleCloseReset} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleResetPassword}>
          <DialogTitle>Återställ lösenord</DialogTitle>
          <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.
            </Typography>
            {resetError && (
              <Alert severity="error" onClose={() => setResetError("")}>
                {resetError}
              </Alert>
            )}
            {resetSuccess && (
              <Alert severity="success" onClose={() => setResetSuccess("")}>
                {resetSuccess}
              </Alert>
            )}
            <TextField
              label="E-post"
              name="reset-email"
              type="email"
              value={resetEmail}
              onChange={(event) => setResetEmail(event.target.value)}
              autoComplete="email"
              autoFocus
              required
              fullWidth
            />
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 2 }}>
            <Button onClick={handleCloseReset} disabled={resetSubmitting}>
              Stäng
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={resetSubmitting || !resetEmail.trim()}
            >
              {resetSubmitting ? "Skickar..." : "Skicka länk"}
            </Button>
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
}

export default function LoginPage() {
  if (AUTH_DISABLED_FLAG) {
    return null;
  }
  return <LoginPageContent />;
}
