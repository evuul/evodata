"use client";

import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";

const DEFAULT_LOCALE = "sv";
const SUPPORTED_LOCALES = ["sv", "en"];
const STORAGE_KEY = "evodata_locale";

const LocaleContext = createContext({
  locale: DEFAULT_LOCALE,
  setLocale: () => {},
});

function normalizeLocale(value) {
  if (!value || typeof value !== "string") return DEFAULT_LOCALE;
  const normalized = value.toLowerCase();
  return SUPPORTED_LOCALES.includes(normalized) ? normalized : DEFAULT_LOCALE;
}

export const LocaleProvider = ({ children }) => {
  const [locale, setLocaleState] = useState(() => {
    if (typeof window === "undefined") return DEFAULT_LOCALE;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return normalizeLocale(stored);
  });

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (stored) {
      setLocaleState(normalizeLocale(stored));
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // ignore storage errors
    }
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
