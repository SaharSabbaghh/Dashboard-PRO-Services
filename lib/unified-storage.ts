/**
 * Unified Storage Layer
 * 
 * Automatically selects between:
 * - File System storage (development, when BLOB_READ_WRITE_TOKEN is not set)
 * - Vercel Blob storage (production, when BLOB_READ_WRITE_TOKEN is set)
 */

import * as fsStorage from './storage';
import * as blobStorage from './blob-storage';
import type { DailyData, RunStats } from './storage';
import type { OverseasSalesData, TodoRow } from './todo-types';
import { getTodayDate as getTodayDateUtil } from './date-utils';

// Check if we should use blob storage
function isBlobEnabled(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

// ============================================================
// Daily Data Operations
// ============================================================

export async function getDailyData(date: string): Promise<DailyData | null> {
  if (isBlobEnabled()) {
    return await blobStorage.getDailyDataBlob(date);
  }
  return fsStorage.getDailyData(date);
}

export async function saveDailyData(date: string, data: DailyData): Promise<void> {
  if (isBlobEnabled()) {
    await blobStorage.saveDailyDataBlob(date, data);
  } else {
    fsStorage.saveDailyData(date, data);
  }
}

export async function getAvailableDates(): Promise<string[]> {
  if (isBlobEnabled()) {
    return await blobStorage.getAvailableDatesBlob();
  }
  return fsStorage.getAvailableDates();
}

export async function getOrCreateDailyData(date: string, fileName?: string): Promise<DailyData> {
  const existing = await getDailyData(date);
  if (existing) return existing;
  
  return {
    date,
    fileName,
    totalConversations: 0,
    processedCount: 0,
    isProcessing: false,
    runs: [],
    results: [],
    summary: {
      oec: 0,
      owwa: 0,
      travelVisa: 0,
      filipinaPassportRenewal: 0,
      ethiopianPassportRenewal: 0,
      oecConverted: 0,
      owwaConverted: 0,
      travelVisaConverted: 0,
      filipinaPassportRenewalConverted: 0,
      ethiopianPassportRenewalConverted: 0,
      countryCounts: {},
      byContractType: {
        CC: { oec: 0, owwa: 0, travelVisa: 0 },
        MV: { oec: 0, owwa: 0, travelVisa: 0 },
      },
    },
  };
}

// ============================================================
// Overseas Sales Operations
// ============================================================

export async function getOverseasSalesData(): Promise<OverseasSalesData | null> {
  if (isBlobEnabled()) {
    return await blobStorage.getOverseasSalesDataBlob();
  }
  return fsStorage.getOverseasSalesData();
}

export async function saveOverseasSalesData(data: OverseasSalesData): Promise<void> {
  if (isBlobEnabled()) {
    await blobStorage.saveOverseasSalesDataBlob(data);
  } else {
    fsStorage.saveOverseasSalesData(data);
  }
}

export async function processTodosAndSave(todos: TodoRow[]): Promise<OverseasSalesData> {
  if (isBlobEnabled()) {
    return await blobStorage.processTodosAndSaveBlob(todos);
  }
  return fsStorage.processTodosAndSave(todos);
}

export async function reprocessAllOverseasSales(todos: TodoRow[]): Promise<OverseasSalesData> {
  if (isBlobEnabled()) {
    return await blobStorage.reprocessAllOverseasSalesBlob(todos);
  }
  return fsStorage.reprocessAllOverseasSales(todos);
}

export async function getOverseasSalesSummary(): Promise<{
  totalSales: number;
  totalRawTodos: number;
  salesByMonth: Record<string, number>;
  lastUpdated: string | null;
}> {
  if (isBlobEnabled()) {
    return await blobStorage.getOverseasSalesSummaryBlob();
  }
  return fsStorage.getOverseasSalesSummary();
}

// ============================================================
// Run Management
// ============================================================

export async function startRun(date: string): Promise<string> {
  if (isBlobEnabled()) {
    return await blobStorage.startRunBlob(date);
  }
  return fsStorage.startRun(date);
}

export async function updateRun(date: string, runId: string, stats: Partial<RunStats>): Promise<void> {
  if (isBlobEnabled()) {
    await blobStorage.updateRunBlob(date, runId, stats);
  } else {
    fsStorage.updateRun(date, runId, stats);
  }
}

export async function completeRun(date: string, runId: string): Promise<void> {
  if (isBlobEnabled()) {
    await blobStorage.completeRunBlob(date, runId);
  } else {
    fsStorage.completeRun(date, runId);
  }
}

export async function getLatestRun(date: string): Promise<RunStats | null> {
  if (isBlobEnabled()) {
    return await blobStorage.getLatestRunBlob(date);
  }
  return fsStorage.getLatestRun(date);
}

// ============================================================
// Aggregated Results
// ============================================================

export async function getAggregatedResultsByDate(date: string) {
  if (isBlobEnabled()) {
    return await blobStorage.getAggregatedResultsByDateBlob(date);
  }
  return fsStorage.getAggregatedResultsByDate(date);
}

// ============================================================
// Prospect Details
// ============================================================

export async function getProspectDetailsByDate(date: string) {
  if (isBlobEnabled()) {
    return await blobStorage.getProspectDetailsByDateBlob(date);
  }
  return fsStorage.getProspectDetailsByDate(date);
}

export async function getProspectsGroupedByHousehold(date: string) {
  if (isBlobEnabled()) {
    return await blobStorage.getProspectsGroupedByHouseholdBlob(date);
  }
  return fsStorage.getProspectsGroupedByHousehold(date);
}

// ============================================================
// Helper exports
// ============================================================

export function getTodayDate(): string {
  return getTodayDateUtil();
}

// Re-export types
export type { DailyData, ProcessedConversation, RunStats, HouseholdGroup } from './storage';

