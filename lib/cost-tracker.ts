/**
 * Cost Tracker
 * Tracks and logs API expenses for every LLM call.
 */

import fs from 'fs';
import path from 'path';

const COST_LOG_FILE = path.join(process.cwd(), 'data', 'cost-log.json');

// Pricing per 1M tokens
export const PRICING = {
  'gpt-4o-mini': {
    input: 0.15,
    output: 0.60,
    batchInput: 0.075,
    batchOutput: 0.30,
  },
  'gpt-4o': {
    input: 2.50,
    output: 10.00,
    batchInput: 1.25,
    batchOutput: 5.00,
  },
  'deepseek/deepseek-chat': {
    input: 0.14,
    output: 0.28,
    batchInput: 0.14,
    batchOutput: 0.28,
  },
};

export interface CostEntry {
  id: string;
  timestamp: string;
  model: string;
  type: 'realtime' | 'batch';
  tokens: { input: number; output: number };
  cost: number;
  conversationId?: string;
  success: boolean;
  error?: string;
}

export interface CostSummary {
  totalCost: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCalls: number;
  successCount: number;
  failureCount: number;
  byModel: Record<string, {
    cost: number;
    calls: number;
    inputTokens: number;
    outputTokens: number;
    successCount: number;
    failureCount: number;
  }>;
  byType: {
    realtime: { cost: number; calls: number; successCount: number; failureCount: number };
    batch: { cost: number; calls: number; successCount: number; failureCount: number };
  };
  entries: CostEntry[];
  failedRequests: Array<{
    id: string;
    timestamp: string;
    model: string;
    type: string;
    conversationId?: string;
    error: string;
  }>;
}

function ensureLogFile(): CostSummary {
  const dir = path.dirname(COST_LOG_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  if (!fs.existsSync(COST_LOG_FILE)) {
    const initial: CostSummary = {
      totalCost: 0,
      totalInputTokens: 0,
      totalOutputTokens: 0,
      totalCalls: 0,
      successCount: 0,
      failureCount: 0,
      byModel: {},
      byType: {
        realtime: { cost: 0, calls: 0, successCount: 0, failureCount: 0 },
        batch: { cost: 0, calls: 0, successCount: 0, failureCount: 0 },
      },
      entries: [],
      failedRequests: [],
    };
    fs.writeFileSync(COST_LOG_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  
  const data = JSON.parse(fs.readFileSync(COST_LOG_FILE, 'utf-8'));
  if (!data.successCount) data.successCount = 0;
  if (!data.failureCount) data.failureCount = 0;
  if (!data.failedRequests) data.failedRequests = [];
  
  return data;
}

export function calculateCost(
  model: string,
  inputTokens: number,
  outputTokens: number,
  isBatch: boolean = false
): number {
  const pricing = PRICING[model as keyof typeof PRICING] || PRICING['gpt-4o-mini'];
  const inputRate = isBatch ? pricing.batchInput : pricing.input;
  const outputRate = isBatch ? pricing.batchOutput : pricing.output;
  return (inputTokens / 1_000_000) * inputRate + (outputTokens / 1_000_000) * outputRate;
}

export function logCost(entry: Omit<CostEntry, 'id' | 'timestamp' | 'success'>): CostEntry {
  const summary = ensureLogFile();
  
  const fullEntry: CostEntry = {
    ...entry,
    id: `cost_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    success: true,
  };
  
  summary.totalCost += entry.cost;
  summary.totalInputTokens += entry.tokens.input;
  summary.totalOutputTokens += entry.tokens.output;
  summary.totalCalls += 1;
  summary.successCount += 1;
  
  if (!summary.byModel[entry.model]) {
    summary.byModel[entry.model] = { cost: 0, calls: 0, inputTokens: 0, outputTokens: 0, successCount: 0, failureCount: 0 };
  }
  summary.byModel[entry.model].cost += entry.cost;
  summary.byModel[entry.model].calls += 1;
  summary.byModel[entry.model].inputTokens += entry.tokens.input;
  summary.byModel[entry.model].outputTokens += entry.tokens.output;
  summary.byModel[entry.model].successCount += 1;
  
  summary.byType[entry.type].cost += entry.cost;
  summary.byType[entry.type].calls += 1;
  summary.byType[entry.type].successCount += 1;
  
  summary.entries.push(fullEntry);
  if (summary.entries.length > 1000) {
    summary.entries = summary.entries.slice(-1000);
  }
  
  fs.writeFileSync(COST_LOG_FILE, JSON.stringify(summary, null, 2));
  
  return fullEntry;
}

export function logFailure(params: {
  model: string;
  type: 'realtime' | 'batch';
  conversationId?: string;
  error: string;
}): void {
  const summary = ensureLogFile();
  
  const failedEntry = {
    id: `fail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    timestamp: new Date().toISOString(),
    model: params.model,
    type: params.type,
    conversationId: params.conversationId,
    error: params.error,
  };
  
  summary.totalCalls += 1;
  summary.failureCount += 1;
  
  if (!summary.byModel[params.model]) {
    summary.byModel[params.model] = { cost: 0, calls: 0, inputTokens: 0, outputTokens: 0, successCount: 0, failureCount: 0 };
  }
  summary.byModel[params.model].calls += 1;
  summary.byModel[params.model].failureCount += 1;
  
  summary.byType[params.type].calls += 1;
  summary.byType[params.type].failureCount += 1;
  
  summary.failedRequests.push(failedEntry);
  if (summary.failedRequests.length > 100) {
    summary.failedRequests = summary.failedRequests.slice(-100);
  }
  
  fs.writeFileSync(COST_LOG_FILE, JSON.stringify(summary, null, 2));
}

export function getCostSummary(): CostSummary {
  return ensureLogFile();
}

export function getTodayCosts(): { cost: number; calls: number } {
  const summary = ensureLogFile();
  const today = new Date().toISOString().split('T')[0];
  
  let cost = 0;
  let calls = 0;
  
  for (const entry of summary.entries) {
    if (entry.timestamp.startsWith(today)) {
      cost += entry.cost;
      calls += 1;
    }
  }
  
  return { cost, calls };
}

export function resetCostLog(): void {
  const initial: CostSummary = {
    totalCost: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    totalCalls: 0,
    successCount: 0,
    failureCount: 0,
    byModel: {},
    byType: {
      realtime: { cost: 0, calls: 0, successCount: 0, failureCount: 0 },
      batch: { cost: 0, calls: 0, successCount: 0, failureCount: 0 },
    },
    entries: [],
    failedRequests: [],
  };
  fs.writeFileSync(COST_LOG_FILE, JSON.stringify(initial, null, 2));
}
