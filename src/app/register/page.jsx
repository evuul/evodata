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
  Typography,
} from "@mui/material";
import { useAuth } from "@/context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { register, isAuthenticated, initialized, authDisabled } = useAuth();

  const [form, setForm] = useState({ email: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
      setError("Lösenorden matchar inte.");
      return;
    }

    setSubmitting(true);

    try {
      await register({ email: form.email.trim(), password: form.password });
      router.replace("/");
    } catch (err) {
      setError(err?.message || "Registreringen misslyckades. Försök igen.");
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
        <Box component="header" sx={{ textAlign: "center", mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600, color: "#fff" }}>
            Registrera konto
          </Typography>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.7)", mt: 1 }}>
            Skapa ett konto för att komma igång.
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
            autoComplete="new-password"
            required
            fullWidth
            InputLabelProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
            InputProps={{ sx: { color: "#fff" } }}
            FormHelperTextProps={{ sx: { color: "rgba(255,255,255,0.7)" } }}
            helperText="Minst 8 tecken, inkludera gärna siffror och specialtecken."
          />

          <TextField
            label="Bekräfta lösenord"
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
            {submitting ? "Registrerar..." : "Registrera mig"}
          </Button>
        </Box>

        <Box sx={{ mt: 3, textAlign: "center" }}>
          <Typography variant="body2" sx={{ color: "rgba(255,255,255,0.6)" }}>
            Har du redan ett konto?{" "}
            <Link component={NextLink} href="/login" underline="hover" sx={{ color: "#4a90e2" }}>
              Logga in här
            </Link>
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
}
