"use client";

import { Suspense, useEffect, useState } from "react";
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
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { LOCALE_OPTIONS, useLocale, useTranslate } from "@/context/LocaleContext";

const AUTH_DISABLED_FLAG = process.env.NEXT_PUBLIC_AUTH_DISABLED === "true";
const LIVE_TOP3_ENDPOINT = process.env.NEXT_PUBLIC_LIVE_TOP3_ENDPOINT ?? "/api/live-top3";
const LIVE_TOP3_PREFETCH_PARAMS = new URLSearchParams({
  historyDays: "7",
  historyPerDay: "6",
}).toString();

const prefetchLiveTop3 = () => {
  try {
    fetch(`${LIVE_TOP3_ENDPOINT}?${LIVE_TOP3_PREFETCH_PARAMS}`, { cache: "no-store" }).catch(() => {
      // Swallow network errors; dashboard can still load without immediate top wins data.
    });
  } catch {
    // Ignore synchronous errors (e.g. malformed endpoint); component fetch will retry later.
  }
};

function LoginPageFallback() {
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

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login, requestPasswordReset, isAuthenticated, initialized, authDisabled, passwordResetEnabled } = useAuth();
  const translate = useTranslate();
  const { locale, setLocale } = useLocale();

  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");

  const defaultLoginError = translate("Något gick fel. Försök igen.", "Something went wrong. Please try again.");
  const defaultResetSuccess = translate(
    "Om e-postadressen finns registrerad skickar vi en återställningslänk inom kort.",
    "If the email exists we will send a reset link shortly."
  );
  const defaultResetError = translate(
    "Kunde inte skicka återställningslänken. Försök igen.",
    "Could not send the reset link. Please try again."
  );
  const emailLabel = translate("E-post", "Email");
  const passwordLabel = translate("Lösenord", "Password");
  const loginTitle = translate("Logga in", "Log in");
  const loginSubtitle = translate("Ange dina uppgifter för att fortsätta.", "Enter your details to continue.");
  const loginButtonLabel = translate("Logga in", "Log in");
  const loginLoadingLabel = translate("Loggar in...", "Logging in...");
  const forgotPasswordLabel = translate("Glömt ditt lösenord?", "Forgot your password?");
  const noAccountLabel = translate("Inget konto än?", "No account yet?");
  const registerHereLabel = translate("Registrera dig här", "Register here");
  const skipLoginLabel = translate("Gå vidare utan att logga in", "Continue without logging in");
  const resetTitle = translate("Återställ lösenord", "Reset password");
  const resetDescription = translate(
    "Ange din e-postadress så skickar vi en länk för att återställa ditt lösenord.",
    "Enter your email and we'll send you a link to reset your password."
  );
  const closeLabel = translate("Stäng", "Close");
  const sendingLabel = translate("Skickar...", "Sending...");
  const sendLinkLabel = translate("Skicka länk", "Send link");

  useEffect(() => {
    if (authDisabled) {
      router.replace("/");
    }
  }, [authDisabled, router]);

  useEffect(() => {
    if (initialized && isAuthenticated) {
      prefetchLiveTop3();
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
      prefetchLiveTop3();
      const next = searchParams?.get("next");
      router.replace(next || "/");
    } catch (err) {
      setError(err?.message || defaultLoginError);
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
      setResetSuccess(defaultResetSuccess);
    } catch (err) {
      setResetError(err?.message || defaultResetError);
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
        <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
          <ToggleButtonGroup
            exclusive
            size="small"
            value={locale}
            onChange={(_, value) => value && setLocale(value)}
            sx={{
              backgroundColor: "rgba(148,163,184,0.15)",
              borderRadius: "999px",
              p: 0.3,
            }}
          >
            {LOCALE_OPTIONS.map((option) => (
              <ToggleButton
                key={option.value}
                value={option.value}
                sx={{
                  textTransform: "none",
                  border: 0,
                  borderRadius: "999px!important",
                  color: "rgba(226,232,240,0.75)",
                  "&.Mui-selected": {
                    color: "#0f172a",
                    backgroundColor: "#f8fafc",
                    fontWeight: 700,
                  },
                }}
              >
                {option.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Box>

        <Box component="header" sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: "#fff" }}>
            {loginTitle}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 1 }}>
            {loginSubtitle}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2.5 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <TextField
            label={emailLabel}
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
            label={passwordLabel}
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
            {submitting ? loginLoadingLabel : loginButtonLabel}
          </Button>
        </Box>

        {passwordResetEnabled ? (
          <Box sx={{ mt: 2, textAlign: "center" }}>
            <Link
              component="button"
              type="button"
              onClick={handleOpenReset}
              underline="hover"
              sx={{ color: "#4a90e2", fontWeight: 500 }}
            >
              {forgotPasswordLabel}
            </Link>
          </Box>
        ) : null}

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
            {noAccountLabel}{" "}
            <Link component={NextLink} href="/register" underline="hover" sx={{ color: "#4a90e2" }}>
              {registerHereLabel}
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
            {skipLoginLabel}
          </Button>
        </Box>
      </Paper>

      <Dialog open={resetDialogOpen} onClose={handleCloseReset} fullWidth maxWidth="xs">
        <Box component="form" onSubmit={handleResetPassword}>
          <DialogTitle>{resetTitle}</DialogTitle>
          <DialogContent sx={{ display: "grid", gap: 2, pt: 1 }}>
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              {resetDescription}
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
              label={emailLabel}
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
              {closeLabel}
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={resetSubmitting || !resetEmail.trim()}
            >
              {resetSubmitting ? sendingLabel : sendLinkLabel}
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
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
