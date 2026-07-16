"use client";

// Panel selection, URL sync and mobile overview card navigation.

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const LIVE_HEADER_OVERVIEW_CARDS = 4;
const PANEL_VALUE_LIST = [
  "live",
  "financial",
  "calendar",
  "gameshow",
  "fairvalue",
  "report",
  "money",
  "buybacks",
  "short",
  "faq",
];

export function useLiveHeaderNavigation({ isMobileMenu, translate }) {
  const [activePanel, setActivePanel] = useState("live");
  const [mobileCardIndex, setMobileCardIndex] = useState(0);
  const mobileCardsRef = useRef(null);

  const panelValues = useMemo(() => new Set(PANEL_VALUE_LIST), []);
  const panelGroups = useMemo(
    () => [
      {
        id: "business",
        label: translate("Verksamheten", "Business"),
        options: [{ value: "live", label: translate("Gameshows", "Gameshows") }],
      },
      {
        id: "financial",
        label: translate("Finansiellt", "Financials"),
        options: [
          { value: "financial", label: translate("Finansiell översikt", "Financial overview") },
          { value: "calendar", label: translate("Kalender", "Calendar") },
          { value: "gameshow", label: translate("Omsättningsprognos", "Revenue forecast") },
          { value: "report", label: translate("Rapportanalys", "Report analysis") },
        ],
      },
      {
        id: "share",
        label: translate("Aktien", "The share"),
        options: [
          { value: "fairvalue", label: translate("Modellvärde", "Model value") },
          { value: "buybacks", label: translate("Återköp", "Buybacks") },
          { value: "short", label: translate("Blankning", "Short interest") },
        ],
      },
      {
        id: "tools",
        label: translate("Verktyg", "Tools"),
        options: [{ value: "money", label: translate("Simulerad vinsttakt", "Simulated profit pace") }],
      },
      {
        id: "help",
        label: translate("Hjälp", "Help"),
        options: [{ value: "faq", label: translate("Metodik & FAQ", "Methodology & FAQ") }],
      },
    ],
    [translate]
  );
  const panelOptions = useMemo(
    () => panelGroups.flatMap((group) => group.options),
    [panelGroups]
  );

  const scrollToCard = useCallback((index) => {
    const el = mobileCardsRef.current;
    if (!el) return;
    const width = el.clientWidth;
    if (!width) return;
    el.scrollTo({ left: index * width, behavior: "smooth" });
  }, []);

  useEffect(() => {
    if (!isMobileMenu) return () => {};
    const el = mobileCardsRef.current;
    if (!el) return () => {};

    let rafId = 0;
    const updateIndex = () => {
      const width = el.clientWidth;
      if (!width) return;
      const nextIndex = Math.max(0, Math.min(LIVE_HEADER_OVERVIEW_CARDS - 1, Math.round(el.scrollLeft / width)));
      setMobileCardIndex(nextIndex);
    };

    const onScroll = () => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateIndex);
    };

    updateIndex();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateIndex);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateIndex);
    };
  }, [isMobileMenu]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const panelParam = params.get("panel");
    if (panelParam && panelValues.has(panelParam)) {
      setActivePanel(panelParam);
    }
  }, [panelValues]);

  const handlePanelChange = useCallback((_, value) => {
    if (!value) return;
    setActivePanel(value);
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    if (value === "live") {
      url.searchParams.delete("panel");
    } else {
      url.searchParams.set("panel", value);
    }
    window.history.replaceState(null, "", url.toString());
  }, []);

  return {
    activePanel,
    setActivePanel,
    panelValues,
    panelGroups,
    panelOptions,
    handlePanelChange,
    isLiveMoneyPanel: activePanel === "money",
    isLivePanel: activePanel === "live",
    mobileCardsRef,
    mobileCardIndex,
    scrollToCard,
  };
}
