"use client";
import React from "react";
import { StockPriceProvider } from "@/context/StockPriceContext";
import { PlayersLiveProvider } from "@/context/PlayersLiveContext";
import { FxRateProvider } from "@/context/FxRateContext";

export default function Providers({ children }) {
  return (
    <FxRateProvider>
      <StockPriceProvider stockSymbol="EVO.ST" updateInterval={300000}>
        <PlayersLiveProvider>{children}</PlayersLiveProvider>
      </StockPriceProvider>
    </FxRateProvider>
  );
}
