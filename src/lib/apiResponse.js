const ERROR_SNIPPET_LENGTH = 160;

function compactSnippet(text) {
  return text.replace(/\s+/g, " ").trim().slice(0, ERROR_SNIPPET_LENGTH);
}

export async function parseJsonResponse(res, options = {}) {
  const { requireOk = true, okField = "ok" } = options;

  const raw = await res.text();
  const trimmed = raw.trim();
  const snippet = compactSnippet(trimmed || raw || "");

  if (!trimmed) {
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    throw new Error(`Servern svarade utan data (status ${res.status})`);
  }

  let data;
  try {
    data = JSON.parse(trimmed);
  } catch {
    throw new Error(
      snippet
        ? `Servern svarade inte med JSON (status ${res.status}): ${snippet}`
        : `Servern svarade inte med JSON (status ${res.status})`
    );
  }

  if (!res.ok) {
    const message = data?.error || data?.message;
    if (message) throw new Error(message);
    if (snippet) throw new Error(`HTTP ${res.status}: ${snippet}`);
    throw new Error(`HTTP ${res.status}`);
  }

  if (requireOk && okField) {
    const okValue = data?.[okField];
    if (okValue !== true) {
      const message = data?.error || data?.message;
      if (message) throw new Error(message);
      if (snippet) throw new Error(`Ogiltigt svar: ${snippet}`);
      throw new Error("Ogiltigt svar från API:t");
    }
  }

  return data;
}
