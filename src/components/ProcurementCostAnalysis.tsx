"use client";
import React from "react";
import { ProcurementProvider } from "@/context/ProcurementContext";
import ProcurementApp from "./ProcurementApp";

export default function ProcurementCostAnalysis() {
  return (
    <ProcurementProvider>
      <ProcurementApp />
    </ProcurementProvider>
  );
}
