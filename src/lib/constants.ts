import { Vendor } from "@/types/procurement";

export const INITIAL_VENDORS: Vendor[] = [
  { id: "1", name: "供應商 A", price: 0 },
  { id: "2", name: "供應商 B", price: 0 },
  { id: "3", name: "供應商 C", price: 0 },
];

export const GEMINI_PDF_VISION_MODEL = "gemini-3-flash-preview";
export const GEMINI_PHASE2_TEXT_MODEL = "gemini-3-flash-preview";
export const extractJsonArrayFromText = (t: string) => JSON.parse(t);
