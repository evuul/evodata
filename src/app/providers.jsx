"use client";
import React from "react";
import { StockPriceProvider } from "@/context/StockPriceContext";
import { PlayersLiveProvider } from "@/context/PlayersLiveContext";

export default function Providers({ children }) {
  return (
    <StockPriceProvider stockSymbol="EVO.ST" updateInterval={300000}>
      <PlayersLiveProvider>
        {children}
      </PlayersLiveProvider>
    </StockPriceProvider>
  );
}