"use client";
import React, { createContext, useContext, ReactNode } from "react";
import { useProcurementStates } from "@/hooks/useProcurementStates";
import { useCostCalculations } from "@/hooks/useCostCalculations";
import { useProcurementHandlers } from "@/hooks/useProcurementHandlers";

export interface ProcurementContextProps {
  [key: string]: any;
}

export const ProcurementContext = createContext<ProcurementContextProps | undefined>(undefined);

export const ProcurementProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const states = useProcurementStates();
  const calculations = useCostCalculations(states);
  const handlers = useProcurementHandlers(states, calculations);

  const contextValue = {
    ...states,
    ...calculations,
    ...handlers
  };

  return (
    <ProcurementContext.Provider value={contextValue}>
      {children}
    </ProcurementContext.Provider>
  );
};

export const useProcurement = () => {
  const context = useContext(ProcurementContext);
  if (!context) throw new Error("useProcurement must be used within a ProcurementProvider");
  return context;
};
