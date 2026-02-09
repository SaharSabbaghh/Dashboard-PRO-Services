// Types for To Do (Overseas Sales) data

export interface TodoRow {
  id: string;
  todoName: string;
  contractId: string;
  clientId: string;
  housemaidId: string;
  createdAt: string; // ISO date string
  completedAt?: string;
  status?: string;
}

export interface OverseasSale {
  id: string;
  contractId: string;
  clientId: string;
  housemaidId: string;
  firstSaleDate: string; // ISO date string of the first occurrence
  lastSaleDate: string; // ISO date string of the most recent occurrence
  occurrenceCount: number; // Total number of To Dos (before deduplication)
  deduplicatedCount: number; // Count after applying 3-month rule
  relatedTodoIds: string[]; // All To Do IDs that contributed to this sale
}

export interface OverseasSalesData {
  lastUpdated: string;
  totalRawTodos: number;
  totalDedupedSales: number;
  sales: OverseasSale[];
  // Summary by time period
  salesByMonth: Record<string, number>; // "2026-01": 5, "2026-02": 3
}

// Deduplication key: combination of contract, client, and housemaid
export function getSaleKey(todo: TodoRow): string {
  return `${todo.contractId || 'no-contract'}_${todo.clientId || 'no-client'}_${todo.housemaidId || 'no-housemaid'}`;
}

// Check if two dates are within 3 months of each other
export function isWithinThreeMonths(date1: string, date2: string): boolean {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  
  // Calculate difference in months
  const monthsDiff = Math.abs(
    (d2.getFullYear() - d1.getFullYear()) * 12 + 
    (d2.getMonth() - d1.getMonth())
  );
  
  // If less than 3 full months, check the days
  if (monthsDiff < 3) {
    return true;
  }
  
  // If exactly 3 months, compare the day of month
  if (monthsDiff === 3) {
    const laterDate = d1 > d2 ? d1 : d2;
    const earlierDate = d1 > d2 ? d2 : d1;
    
    // Calculate exact 3 months from earlier date
    const threeMonthsLater = new Date(earlierDate);
    threeMonthsLater.setMonth(threeMonthsLater.getMonth() + 3);
    
    return laterDate < threeMonthsLater;
  }
  
  return false;
}

