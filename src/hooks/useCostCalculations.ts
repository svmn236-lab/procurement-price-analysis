import { useMemo } from "react";
import { Vendor } from "@/types/procurement";

export function useCostCalculations(states: any) {
  const { 
    costBreakdown, activeChatId, vendors, totalQty, aiEstimatedPrice 
  } = states;

  const activeCostItem = useMemo(() => {
    return costBreakdown.find((item: any) => item.item === activeChatId) || null;
  }, [costBreakdown, activeChatId]);

  const stats = useMemo(() => {
    const validPrices = vendors.map((v: Vendor) => v.price).filter((p: number) => p > 0);
    
    if (validPrices.length === 0) return { minPrice: 0, maxPrice: 0, variance: 0, totalBudget: 0 };
    
    const minPrice = Math.min(...validPrices);
    const maxPrice = Math.max(...validPrices);
    const variance = ((maxPrice - minPrice) / minPrice) * 100;
    const totalBudget = minPrice * (Number(totalQty) || 0);
    
    return { minPrice, maxPrice, variance, totalBudget };
  }, [vendors, totalQty]);

  type ChartRow = { id: string; name: string; price: number; type: 'vendor' | 'ai' };

  const chartData = useMemo<ChartRow[]>(() => {
    const data: ChartRow[] = vendors.map((v: Vendor) => ({ id: v.id, name: v.name, price: v.price, type: 'vendor' }));
    if (aiEstimatedPrice !== null) {
      data.push({ id: 'ai-estimate', name: 'AI 估算報價', price: aiEstimatedPrice, type: 'ai' });
    }
    return data.sort((a, b) => a.price - b.price);
  }, [vendors, aiEstimatedPrice]);

  return { activeCostItem, stats, chartData };
}
