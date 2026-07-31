"use client";
import React from "react";
import { usePathname } from "next/navigation";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { StockPriceProvider } from "@/context/StockPriceContext";
import { PlayersLiveProvider } from "@/context/PlayersLiveContext";
import { FxRateProvider } from "@/context/FxRateContext";
import { LocaleProvider } from "@/context/LocaleContext";
import SupportNotificationWatcher from "@/Components/SupportNotificationWatcher";
import { shouldEnableAuthenticatedLiveData, shouldRestoreAuthSession } from "@/lib/providerActivity";

function InnerProviders({ children }) {
  const { isAuthenticated } = useAuth();
  const pathname = usePathname();
  const liveDataEnabled = isAuthenticated && shouldEnableAuthenticatedLiveData(pathname);

  return (
    <FxRateProvider enabled={liveDataEnabled}>
      <StockPriceProvider stockSymbol="EVO.ST" updateInterval={300000} enabled={liveDataEnabled}>
        <PlayersLiveProvider enabled={liveDataEnabled}>
          {children}
          {liveDataEnabled ? <SupportNotificationWatcher /> : null}
        </PlayersLiveProvider>
      </StockPriceProvider>
    </FxRateProvider>
  );
}

export default function Providers({ children }) {
  const pathname = usePathname();

  return (
    <LocaleProvider>
      <AuthProvider restoreSession={shouldRestoreAuthSession(pathname)}>
        <InnerProviders>{children}</InnerProviders>
      </AuthProvider>
    </LocaleProvider>
  );
}
