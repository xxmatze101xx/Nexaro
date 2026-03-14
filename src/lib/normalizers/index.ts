/**
 * normalizers/index.ts
 * Barrel export for the Nexaro message normalization layer.
 *
 * Usage:
 *   import { normalizeGmail, normalizeSlack, type UnifiedMessage } from "@/lib/normalizers";
 */

export * from "./types";
export * from "./gmail";
export * from "./slack";
export * from "./teams";
