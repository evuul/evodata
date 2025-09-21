"use client";

import React, { useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Alert,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import ChatBubbleOutlineIcon from "@mui/icons-material/ChatBubbleOutline";

const categories = [
  { value: "Förslag", label: "Förslag" },
  { value: "Bug", label: "Buggrapport" },
  { value: "Beröm", label: "Beröm" },
  { value: "Övrigt", label: "Övrigt" },
];

export default function FeedbackBox({ buttonVariant = "contained" }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("Förslag");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const reset = () => {
    setCategory("Förslag");
    setMessage("");
    setEmail("");
    setError("");
    setSuccess("");
  };

  const handleSubmit = async () => {
    setError("");
    setSuccess("");
    if (!message || message.trim().length < 5) {
      setError("Skriv gärna lite mer (minst 5 tecken).");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, message: message.trim(), email: email.trim() || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || "Kunde inte skicka feedback just nu.");
      }
      setSuccess("Tack! Din feedback är mottagen.");
      // Stäng efter en liten stund
      setTimeout(() => {
        setOpen(false);
        reset();
      }, 900);
    } catch (e) {
      setError(e.message || "Något gick fel. Försök igen.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Tooltip title="Tyck till eller föreslå något">
        <Button
          variant="outlined"
          color="inherit"
          size="small"
          startIcon={<ChatBubbleOutlineIcon fontSize="small" />}
          onClick={() => setOpen(true)}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            borderColor: "#555",
            color: "#e0e0e0",
            backgroundColor: "transparent",
            px: 1.25,
            '&:hover': {
              borderColor: '#777',
              backgroundColor: '#2a2a2a',
            },
          }}
        >
          Tyck till
        </Button>
      </Tooltip>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Förslagslåda</DialogTitle>
        <DialogContent>
          {error ? (
            <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>
          ) : null}
          {success ? (
            <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>
          ) : null}
          <TextField
            select
            label="Kategori"
            size="small"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            sx={{ mt: 1, mb: 2 }}
            fullWidth
          >
            {categories.map((c) => (
              <MenuItem key={c.value} value={c.value}>{c.label}</MenuItem>
            ))}
          </TextField>

          <TextField
            label="Din feedback"
            placeholder="Vad önskar du se? Vad funkar bra/mindre bra?"
            multiline
            minRows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            fullWidth
          />

          <TextField
            label="E‑post (valfritt, för uppföljning)"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ mt: 2 }}
            fullWidth
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setOpen(false); reset(); }} disabled={submitting}>
            Avbryt
          </Button>
          <Button onClick={handleSubmit} variant="contained" disabled={submitting}>
            {submitting ? <CircularProgress size={18} sx={{ color: "#fff" }} /> : "Skicka"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
