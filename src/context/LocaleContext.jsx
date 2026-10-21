"use client";

// Restores language preferences safely and keeps assistive technology in sync.

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { readStoredString, writeStoredString } from "@/lib/clientStorage";

const DEFAULT_LOCALE = "sv";
const SUPPORTED_LOCALES = ["sv", "en"];
const STORAGE_KEY = "evodata_locale";

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

const resolveBrowserLocale = () => {
  if (typeof navigator === "undefined") return DEFAULT_LOCALE;
  const candidates = [];
  if (Array.isArray(navigator.languages) && navigator.languages.length) {
    candidates.push(...navigator.languages);
  }
  if (navigator.language) candidates.push(navigator.language);
  if (navigator.userLanguage) candidates.push(navigator.userLanguage);
  const match = candidates.find((value) => typeof value === "string" && value.toLowerCase().startsWith("sv"));
  return match ? "sv" : "en";
};

function normalizeLocale(value) {
  if (!value || typeof value !== "string") return DEFAULT_LOCALE;
  const normalized = value.toLowerCase();
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : DEFAULT_LOCALE;
}

export const LocaleProvider = ({ children }) => {
  // Hydration-safe: start with deterministic default, then hydrate from storage/browser in effect
  const [locale, setLocaleState] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = readStoredString(STORAGE_KEY);
    if (stored) {
      setLocaleState(normalizeLocale(stored));
      return;
    }
    setLocaleState(resolveBrowserLocale());
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    writeStoredString(STORAGE_KEY, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const setLocale = (nextLocale) => {
    setLocaleState(normalizeLocale(nextLocale));
  };

  const value = useMemo(() => ({ locale, setLocale }), [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
};

export const useLocale = () => {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
};

export const LOCALE_OPTIONS = [
  { value: "sv", label: "SV" },
  { value: "en", label: "EN" },
];

export const useTranslate = () => {
  const { locale } = useLocale();
  return useCallback(
    (sv, en) => {
      if (locale === "en") {
        return typeof en === "string" ? en : sv;
      }
      return sv;
    },
    [locale]
  );
};
