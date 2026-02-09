"use client";

import { useEffect, useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import {
  Alert,
  Box,
  Button,
  Container,
  Link,
  Paper,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";
import { LOCALE_OPTIONS, useLocale, useTranslate } from "@/context/LocaleContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, initialized, authDisabled } = useAuth();
  const translate = useTranslate();
  const { locale, setLocale } = useLocale();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const passwordMismatchMessage = translate("Lösenorden matchar inte.", "Passwords do not match.");
  const defaultRegisterError = translate(
    "Registreringen misslyckades. Försök igen.",
    "Registration failed. Please try again."
  );
  const emailLabel = translate("E-post", "Email");
  const firstNameLabel = translate("Förnamn", "First name");
  const lastNameLabel = translate("Efternamn", "Last name");
  const passwordLabel = translate("Lösenord", "Password");
  const confirmPasswordLabel = translate("Bekräfta lösenord", "Confirm password");
  const helperText = translate(
    "Minst 8 tecken, inkludera gärna siffror och specialtecken.",
    "At least 8 characters, preferably with numbers and special symbols."
  );
  const title = translate("Registrera konto", "Create account");
  const subtitle = translate("Skapa ett konto för att komma igång.", "Create an account to get started.");
  const submitLabel = translate("Registrera mig", "Register me");
  const submittingLabel = translate("Registrerar...", "Registering...");
  const hasAccountLabel = translate("Har du redan ett konto?", "Already have an account?");
  const loginHereLabel = translate("Logga in här", "Log in here");

  useEffect(() => {
    if (initialized && isAuthenticated) {
      router.replace("/");
    }
  }, [initialized, isAuthenticated, router]);

  useEffect(() => {
    if (authDisabled) {
      router.replace("/");
    }
  }, [authDisabled, router]);

  if (authDisabled) {
    return null;
  }

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (form.password !== form.confirmPassword) {
      setError(passwordMismatchMessage);
      return;
    }
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError(translate("Ange förnamn och efternamn.", "Please enter first and last name."));
      return;
    }

    setSubmitting(true);

    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        password: form.password,
      });
      router.replace("/");
    } catch (err) {
      setError(err?.message || defaultRegisterError);
    } finally {
      setSubmitting(false);
    }
  };

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
            {title}
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 1 }}>
            {subtitle}
          </Typography>
        </Box>

        <Box component="form" onSubmit={handleSubmit} sx={{ display: "grid", gap: 2.5 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}

          <TextField
            label={firstNameLabel}
            name="firstName"
            value={form.firstName}
            onChange={handleChange}
            autoComplete="given-name"
            required
            fullWidth
            InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
            InputProps={{ sx: { color: "#fff" } }}
          />

          <TextField
            label={lastNameLabel}
            name="lastName"
            value={form.lastName}
            onChange={handleChange}
            autoComplete="family-name"
            required
            fullWidth
            InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
            InputProps={{ sx: { color: "#fff" } }}
          />

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
            autoComplete="new-password"
            required
            fullWidth
            InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
            InputProps={{ sx: { color: "#fff" } }}
            FormHelperTextProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
            helperText={helperText}
          />

          <TextField
            label={confirmPasswordLabel}
            name="confirmPassword"
            type="password"
            value={form.confirmPassword}
            onChange={handleChange}
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
            {submitting ? submittingLabel : submitLabel}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
            {hasAccountLabel}{" "}
            <Link component={NextLink} href="/login" underline="hover" sx={{ color: "#4a90e2" }}>
              {loginHereLabel}
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
