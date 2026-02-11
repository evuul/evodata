"use client";
import React from "react";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StockPriceProvider } from "@/context/StockPriceContext";
import { PlayersLiveProvider } from "@/context/PlayersLiveContext";
import { FxRateProvider } from "@/context/FxRateContext";
import { LocaleProvider } from "@/context/LocaleContext";
import SupportNotificationWatcher from "@/Components/SupportNotificationWatcher";

function InnerProviders({ children }) {
  const { isAuthenticated } = useAuth();

  return (
    <FxRateProvider enabled={isAuthenticated}>
      <StockPriceProvider stockSymbol="EVO.ST" updateInterval={300000} enabled={isAuthenticated}>
        <PlayersLiveProvider enabled={isAuthenticated}>
          {children}
          <SupportNotificationWatcher />
        </PlayersLiveProvider>
      </StockPriceProvider>
    </FxRateProvider>
  );
}

export default function Providers({ children }) {
  return (
    <LocaleProvider>
      <AuthProvider>
        <InnerProviders>{children}</InnerProviders>
      </AuthProvider>
    </LocaleProvider>
  );
}
