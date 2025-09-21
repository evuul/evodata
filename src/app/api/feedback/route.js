import { NextResponse } from "next/server";
export const runtime = "nodejs"; // ensure Node.js runtime for fs support
import fs from "fs";

// Basic in-memory rate limiting (per process)
const rateMap = new Map();
const WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQS = 8; // max 8 submissions per minute per IP

function clientIp(req) {
  const xf = req.headers.get("x-forwarded-for");
  if (xf) return xf.split(",")[0].trim();
  // Fallback; not always available
  return req.headers.get("cf-connecting-ip") || "unknown";
}

function rateLimit(key) {
  const now = Date.now();
  const entry = rateMap.get(key) || { count: 0, start: now };
  if (now - entry.start > WINDOW_MS) {
    entry.count = 0;
    entry.start = now;
  }
  entry.count += 1;
  rateMap.set(key, entry);
  return entry.count <= MAX_REQS;
}

export async function POST(req) {
  try {
    const ip = clientIp(req);
    if (!rateLimit(ip)) {
      return NextResponse.json({ error: "För många förfrågningar, försök igen snart." }, { status: 429 });
    }

    const { category, message, email } = await req.json();

    const msg = typeof message === "string" ? message.trim() : "";
    const cat = typeof category === "string" ? category.trim().slice(0, 40) : "";
    const mail = typeof email === "string" ? email.trim().slice(0, 120) : undefined;

    if (!msg || msg.length < 5) {
      return NextResponse.json({ error: "Meddelandet är för kort." }, { status: 400 });
    }

    const payload = {
      category: cat || "Förslag",
      message: msg,
      email: mail,
      ip,
      userAgent: req.headers.get("user-agent") || "",
      at: new Date().toISOString(),
    };

    // Slack webhook support if configured
    const webhook = process.env.FEEDBACK_SLACK_WEBHOOK;
    if (webhook) {
      const text = `Ny feedback (${payload.category})\n${payload.message}` + (payload.email ? `\nFrån: ${payload.email}` : "");
      try {
        await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text }),
        });
      } catch (e) {
        // Non-fatal; continue with fallback
        console.error("Slack webhook fel:", e);
      }
    } else {
      // Local dev fallback: append to a log file
      try {
        const line = JSON.stringify(payload) + "\n";
        // Avoid write attempts in serverless prod
        if (process.env.NODE_ENV !== "production") {
          fs.appendFileSync("feedback.dev.log", line);
        } else {
          console.log("Feedback:", payload);
        }
      } catch (e) {
        console.error("Loggning misslyckades:", e);
      }
    }

    // Optional e‑post via Resend
    const RESEND_API_KEY = process.env.RESEND_API_KEY;
    const TO = process.env.FEEDBACK_EMAIL_TO;
    const FROM = process.env.FEEDBACK_EMAIL_FROM || "Evolution Tracker <noreply@evodata.app>";

    if (RESEND_API_KEY && TO) {
      const subject = `Feedback: ${payload.category}`;
      const text = `${payload.message}\n\nFrån: ${payload.email || "(ej angiven)"}\nIP: ${payload.ip}\nUA: ${payload.userAgent}\nTid: ${payload.at}`;
      const html = `
        <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5">
          <h2 style="margin:0 0 8px">Ny feedback (${payload.category})</h2>
          <p style="white-space:pre-wrap;margin:0 0 12px">${payload.message.replace(/</g, "&lt;")}</p>
          <hr style="border:none;border-top:1px solid #eee;margin:12px 0" />
          <p style="margin:4px 0"><strong>Från:</strong> ${payload.email || "(ej angiven)"}</p>
          <p style="margin:4px 0"><strong>IP:</strong> ${payload.ip}</p>
          <p style="margin:4px 0"><strong>User‑Agent:</strong> ${payload.userAgent}</p>
          <p style="margin:4px 0"><strong>Tid:</strong> ${payload.at}</p>
        </div>`;
      try {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ from: FROM, to: [TO], subject, text, html }),
        });
      } catch (e) {
        console.error("E‑postutskick misslyckades:", e);
        // Do not fail the request for email errors
      }
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: error?.message || "Internt fel" }, { status: 500 });
  }
}
