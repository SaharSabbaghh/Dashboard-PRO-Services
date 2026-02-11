import fs from 'fs';
import path from 'path';
import type { OverseasSalesData, TodoRow } from './todo-types';
import { processOverseasSales, mergeOverseasSales } from './todo-processor';

export interface ProcessedConversation {
  id: string;
  conversationId: string;
  chatStartDateTime: string;
  maidId: string;
  clientId: string;
  contractId: string;
  maidName: string;
  clientName: string;
  contractType: string; // "CC", "MV", or ""
  messages?: string;
  isOECProspect: boolean;
  isOECProspectConfidence?: number;
  oecConverted?: boolean;
  oecConvertedConfidence?: number;
  isOWWAProspect: boolean;
  isOWWAProspectConfidence?: number;
  owwaConverted?: boolean;
  owwaConvertedConfidence?: number;
  isTravelVisaProspect: boolean;
  isTravelVisaProspectConfidence?: number;
  travelVisaCountries: string[];
  travelVisaConverted?: boolean;
  travelVisaConvertedConfidence?: number;
  processingStatus?: string; // Optional: For tracking if data came from n8n
  processedAt?: string; // Optional: Timestamp when processed
}

export interface RunStats {
  runId: string;
  startedAt: string;
  completedAt?: string;
  totalCost: number;
  successCount: number;
  failureCount: number;
  conversationsProcessed: number;
}

export interface DailyData {
  date: string;
  fileName?: string;
  totalConversations: number;
  processedCount: number;
  isProcessing: boolean;
  currentRunId?: string;
  runs: RunStats[];
  results: ProcessedConversation[];
  summary: {
    oec: number;
    owwa: number;
    travelVisa: number;
    oecConverted: number;
    owwaConverted: number;
    travelVisaConverted: number;
    countryCounts: Record<string, number>;
    byContractType: {
      CC: { oec: number; owwa: number; travelVisa: number };
      MV: { oec: number; owwa: number; travelVisa: number };
    };
  };
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DAILY_DIR = path.join(DATA_DIR, 'daily');
const RUNS_DIR = path.join(DATA_DIR, 'runs');
const TODOS_DIR = path.join(DATA_DIR, 'todos');
const INDEX_FILE = path.join(DATA_DIR, 'dates-index.json');
const OVERSEAS_SALES_FILE = path.join(DATA_DIR, 'overseas-sales.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(DAILY_DIR)) fs.mkdirSync(DAILY_DIR, { recursive: true });
  if (!fs.existsSync(RUNS_DIR)) fs.mkdirSync(RUNS_DIR, { recursive: true });
  if (!fs.existsSync(TODOS_DIR)) fs.mkdirSync(TODOS_DIR, { recursive: true });
}

export function getTodayDate(): string {
  return new Date().toISOString().split('T')[0];
}

function getDailyFilePath(date: string): string {
  return path.join(DAILY_DIR, `${date}.json`);
}

export function getAvailableDates(): string[] {
  ensureDataDir();
  
  // Read directly from daily folder to get actual files
  if (!fs.existsSync(DAILY_DIR)) return [];
  
  const files = fs.readdirSync(DAILY_DIR);
  const dates = files
    .filter(f => f.endsWith('.json'))
    .map(f => f.replace('.json', ''))
    .filter(d => /^\d{4}-\d{2}-\d{2}$/.test(d)) // Validate date format
    .sort()
    .reverse(); // Most recent first
  
  return dates;
}

function addDateToIndex(date: string): void {
  ensureDataDir();
  let dates: string[] = [];
  if (fs.existsSync(INDEX_FILE)) {
    dates = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8')).dates || [];
  }
  if (!dates.includes(date)) {
    dates.push(date);
    dates.sort().reverse();
    fs.writeFileSync(INDEX_FILE, JSON.stringify({ dates, lastUpdated: new Date().toISOString() }, null, 2));
  }
}

export function getDailyData(date: string): DailyData | null {
  ensureDataDir();
  const filePath = getDailyFilePath(date);
  if (!fs.existsSync(filePath)) return null;
  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  // Ensure runs array exists for backward compatibility
  if (!data.runs) data.runs = [];
  return data;
}

export function saveDailyData(date: string, data: DailyData): void {
  ensureDataDir();
  data.summary = calculateSummary(data.results);
  fs.writeFileSync(getDailyFilePath(date), JSON.stringify(data, null, 2));
  addDateToIndex(date);
}

function calculateSummary(results: ProcessedConversation[]) {
  let oec = 0, owwa = 0, travelVisa = 0;
  let oecConverted = 0, owwaConverted = 0, travelVisaConverted = 0;
  const countryCounts: Record<string, number> = {};
  const byContractType = {
    CC: { oec: 0, owwa: 0, travelVisa: 0 },
    MV: { oec: 0, owwa: 0, travelVisa: 0 },
  };
  
  // Group results by household (CONTRACT_ID) - standalone entries get their own group
  const householdMap = new Map<string, ProcessedConversation[]>();
  
  for (const result of results) {
    // Use contractId as household key, or create a standalone key if no contractId
    const householdKey = result.contractId || `standalone_${result.id}`;
    
    if (!householdMap.has(householdKey)) {
      householdMap.set(householdKey, []);
    }
    householdMap.get(householdKey)!.push(result);
  }
  
  // Count prospects per household (not per individual)
  for (const [, members] of householdMap) {
    // Determine contract type for this household (use first non-empty)
    const contractType = members.find(m => m.contractType)?.contractType || '';
    
    // Check if ANY member in household is a prospect (count household once)
    const hasOEC = members.some(m => m.isOECProspect);
    const hasOWWA = members.some(m => m.isOWWAProspect);
    const hasTravelVisa = members.some(m => m.isTravelVisaProspect);
    
    // Check if ANY member in household converted
    const oecConv = members.some(m => m.oecConverted);
    const owwaConv = members.some(m => m.owwaConverted);
    const travelVisaConv = members.some(m => m.travelVisaConverted);
    
    if (hasOEC) {
      oec++;
      if (oecConv) oecConverted++;
      if (contractType === 'CC') byContractType.CC.oec++;
      else if (contractType === 'MV') byContractType.MV.oec++;
    }
    if (hasOWWA) {
      owwa++;
      if (owwaConv) owwaConverted++;
      if (contractType === 'CC') byContractType.CC.owwa++;
      else if (contractType === 'MV') byContractType.MV.owwa++;
    }
    if (hasTravelVisa) {
      travelVisa++;
      if (travelVisaConv) travelVisaConverted++;
      if (contractType === 'CC') byContractType.CC.travelVisa++;
      else if (contractType === 'MV') byContractType.MV.travelVisa++;
      
      // Collect all unique countries from all members in household
      const householdCountries = new Set<string>();
      for (const member of members) {
        if (member.isTravelVisaProspect) {
          for (const country of member.travelVisaCountries) {
            householdCountries.add(country);
          }
        }
      }
      for (const country of householdCountries) {
        countryCounts[country] = (countryCounts[country] || 0) + 1;
      }
    }
  }
  
  return { oec, owwa, travelVisa, oecConverted, owwaConverted, travelVisaConverted, countryCounts, byContractType };
}

export function getOrCreateDailyData(date: string, fileName?: string): DailyData {
  const existing = getDailyData(date);
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
      oecConverted: 0, 
      owwaConverted: 0, 
      travelVisaConverted: 0, 
      countryCounts: {},
      byContractType: {
        CC: { oec: 0, owwa: 0, travelVisa: 0 },
        MV: { oec: 0, owwa: 0, travelVisa: 0 },
      },
    },
  };
}

// Run management
export function startRun(date: string): string {
  const data = getDailyData(date);
  if (!data) throw new Error(`No data for date ${date}`);
  
  const runId = `${date}-${Date.now()}`;
  const run: RunStats = {
    runId,
    startedAt: new Date().toISOString(),
    totalCost: 0,
    successCount: 0,
    failureCount: 0,
    conversationsProcessed: 0,
  };
  
  data.runs.push(run);
  data.isProcessing = true;
  data.currentRunId = runId;
  saveDailyData(date, data);
  
  return runId;
}

export function updateRun(date: string, runId: string, stats: Partial<RunStats>): void {
  const data = getDailyData(date);
  if (!data) return;
  
  const run = data.runs.find(r => r.runId === runId);
  if (run) {
    Object.assign(run, stats);
    saveDailyData(date, data);
  }
}

export function completeRun(date: string, runId: string): void {
  const data = getDailyData(date);
  if (!data) return;
  
  const run = data.runs.find(r => r.runId === runId);
  if (run) {
    run.completedAt = new Date().toISOString();
  }
  data.isProcessing = false;
  data.currentRunId = undefined;
  saveDailyData(date, data);
}

export function getCurrentRun(date: string): RunStats | null {
  const data = getDailyData(date);
  if (!data || !data.currentRunId) return null;
  return data.runs.find(r => r.runId === data.currentRunId) || null;
}

export function getLatestRun(date: string): RunStats | null {
  const data = getDailyData(date);
  if (!data || data.runs.length === 0) return null;
  return data.runs[data.runs.length - 1];
}

export function getAggregatedResultsByDate(date: string) {
  const data = getDailyData(date);
  
  const defaultByContractType = {
    CC: { oec: 0, owwa: 0, travelVisa: 0 },
    MV: { oec: 0, owwa: 0, travelVisa: 0 },
  };
  
  if (!data) {
    return {
      date,
      totalProcessed: 0,
      totalConversations: 0,
      isProcessing: false,
      prospects: { oec: 0, owwa: 0, travelVisa: 0 },
      conversions: { oec: 0, owwa: 0, travelVisa: 0 },
      countryCounts: {},
      byContractType: defaultByContractType,
      latestRun: null,
    };
  }
  
  return {
    date,
    fileName: data.fileName,
    totalProcessed: data.processedCount,
    totalConversations: data.totalConversations,
    isProcessing: data.isProcessing,
    prospects: {
      oec: data.summary.oec,
      owwa: data.summary.owwa,
      travelVisa: data.summary.travelVisa,
    },
    conversions: {
      oec: data.summary.oecConverted,
      owwa: data.summary.owwaConverted,
      travelVisa: data.summary.travelVisaConverted,
    },
    countryCounts: data.summary.countryCounts,
    byContractType: data.summary.byContractType || defaultByContractType,
    latestRun: getLatestRun(date),
  };
}

export function getAllDatesWithSummary() {
  return getAvailableDates().map(date => {
    const data = getDailyData(date);
    if (!data) return null;
    return {
      date,
      fileName: data.fileName,
      totalConversations: data.totalConversations,
      processedCount: data.processedCount,
      isProcessing: data.isProcessing,
      prospects: data.summary,
      latestRun: getLatestRun(date),
    };
  }).filter(Boolean);
}

export function getProspectDetailsByDate(date: string) {
  const data = getDailyData(date);
  if (!data) return [];
  return data.results.filter(r => r.isOECProspect || r.isOWWAProspect || r.isTravelVisaProspect);
}

export interface HouseholdGroup {
  householdId: string;
  contractId: string;
  members: ProcessedConversation[];
  hasClient: boolean;
  hasMaid: boolean;
  clientName: string;
  maidNames: string[];
  isProspect: boolean;
  prospectTypes: {
    oec: boolean;
    owwa: boolean;
    travelVisa: boolean;
  };
  conversions: {
    oec: boolean;
    owwa: boolean;
    travelVisa: boolean;
  };
}

export function getProspectsGroupedByHousehold(date: string): HouseholdGroup[] {
  const data = getDailyData(date);
  if (!data) return [];
  
  // Filter to only prospects
  const prospects = data.results.filter(r => 
    r.isOECProspect || r.isOWWAProspect || r.isTravelVisaProspect
  );
  
  // Group by contractId
  const householdMap = new Map<string, ProcessedConversation[]>();
  
  for (const prospect of prospects) {
    // Use contractId as household key, or create a standalone key
    const householdKey = prospect.contractId || `standalone_${prospect.id}`;
    
    if (!householdMap.has(householdKey)) {
      householdMap.set(householdKey, []);
    }
    householdMap.get(householdKey)!.push(prospect);
  }
  
  // Convert to HouseholdGroup array
  const households: HouseholdGroup[] = [];
  
  for (const [key, members] of householdMap) {
    const isStandalone = key.startsWith('standalone_');
    const contractId = isStandalone ? '' : key;
    
    // Aggregate data from all members
    const hasClient = members.some(m => m.clientId);
    const hasMaid = members.some(m => m.maidId);
    const clientName = members.find(m => m.clientName)?.clientName || '';
    const maidNames = [...new Set(members.map(m => m.maidName).filter(Boolean))];
    
    // Aggregate prospect types
    const prospectTypes = {
      oec: members.some(m => m.isOECProspect),
      owwa: members.some(m => m.isOWWAProspect),
      travelVisa: members.some(m => m.isTravelVisaProspect),
    };
    
    // Aggregate conversions
    const conversions = {
      oec: members.some(m => m.oecConverted),
      owwa: members.some(m => m.owwaConverted),
      travelVisa: members.some(m => m.travelVisaConverted),
    };
    
    households.push({
      householdId: key,
      contractId,
      members,
      hasClient,
      hasMaid,
      clientName,
      maidNames,
      isProspect: true,
      prospectTypes,
      conversions,
    });
  }
  
  // Sort: households with contractId first (grouped), then standalone
  households.sort((a, b) => {
    if (a.contractId && !b.contractId) return -1;
    if (!a.contractId && b.contractId) return 1;
    return a.householdId.localeCompare(b.householdId);
  });
  
  return households;
}

// Recalculate summaries for all daily data files (use after logic changes)
export function recalculateAllSummaries(): { date: string; oldSummary: unknown; newSummary: unknown }[] {
  const dates = getAvailableDates();
  const changes: { date: string; oldSummary: unknown; newSummary: unknown }[] = [];
  
  for (const date of dates) {
    const data = getDailyData(date);
    if (!data) continue;
    
    const oldSummary = { ...data.summary };
    
    // Re-save will trigger calculateSummary with new logic
    saveDailyData(date, data);
    
    // Get the new summary
    const updatedData = getDailyData(date);
    const newSummary = updatedData?.summary;
    
    changes.push({ date, oldSummary, newSummary });
  }
  
  return changes;
}

// ============================================================
// Overseas Sales (To Do) Storage Functions
// ============================================================

export function getOverseasSalesData(): OverseasSalesData | null {
  ensureDataDir();
  if (!fs.existsSync(OVERSEAS_SALES_FILE)) return null;
  try {
    return JSON.parse(fs.readFileSync(OVERSEAS_SALES_FILE, 'utf-8'));
  } catch {
    return null;
  }
}

export function saveOverseasSalesData(data: OverseasSalesData): void {
  ensureDataDir();
  fs.writeFileSync(OVERSEAS_SALES_FILE, JSON.stringify(data, null, 2));
}

export function processTodosAndSave(todos: TodoRow[]): OverseasSalesData {
  const existing = getOverseasSalesData();
  const updated = mergeOverseasSales(existing, todos);
  saveOverseasSalesData(updated);
  return updated;
}

export function reprocessAllOverseasSales(todos: TodoRow[]): OverseasSalesData {
  // Fresh reprocess without merging
  const data = processOverseasSales(todos);
  saveOverseasSalesData(data);
  return data;
}

export function getOverseasSalesSummary(): {
  totalSales: number;
  totalRawTodos: number;
  salesByMonth: Record<string, number>;
  lastUpdated: string | null;
} {
  const data = getOverseasSalesData();
  if (!data) {
    return {
      totalSales: 0,
      totalRawTodos: 0,
      salesByMonth: {},
      lastUpdated: null,
    };
  }
  return {
    totalSales: data.totalDedupedSales,
    totalRawTodos: data.totalRawTodos,
    salesByMonth: data.salesByMonth,
    lastUpdated: data.lastUpdated,
  };
}

// Store raw To Do data for a specific upload
export function saveTodoUpload(fileName: string, todos: TodoRow[]): void {
  ensureDataDir();
  const filePath = path.join(TODOS_DIR, `${fileName.replace(/[^a-zA-Z0-9-_]/g, '_')}.json`);
  fs.writeFileSync(filePath, JSON.stringify({
    fileName,
    uploadedAt: new Date().toISOString(),
    totalTodos: todos.length,
    todos,
  }, null, 2));
}

export function getTodoUploads(): { fileName: string; uploadedAt: string; totalTodos: number }[] {
  ensureDataDir();
  if (!fs.existsSync(TODOS_DIR)) return [];
  
  const files = fs.readdirSync(TODOS_DIR);
  return files
    .filter(f => f.endsWith('.json'))
    .map(f => {
      try {
        const data = JSON.parse(fs.readFileSync(path.join(TODOS_DIR, f), 'utf-8'));
        return {
          fileName: data.fileName || f,
          uploadedAt: data.uploadedAt || '',
          totalTodos: data.totalTodos || 0,
        };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as { fileName: string; uploadedAt: string; totalTodos: number }[];
}
