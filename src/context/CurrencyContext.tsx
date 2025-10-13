import { createContext, useState, useContext, ReactNode } from "react";

type CurrencyCtx = { currency: string; setCurrency: (c: string) => void };

const Ctx = createContext<CurrencyCtx>({ currency: "GNF", setCurrency: () => {} });

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrency] = useState("GNF");
  return <Ctx.Provider value={{ currency, setCurrency }}>{children}</Ctx.Provider>;
}

export const useCurrency = () => useContext(Ctx);


