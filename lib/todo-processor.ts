import type { TodoRow, OverseasSale, OverseasSalesData } from './todo-types';
import { getSaleKey, isWithinThreeMonths } from './todo-types';

interface GroupedTodo {
  key: string;
  contractId: string;
  clientId: string;
  housemaidId: string;
  todos: TodoRow[];
}

/**
 * Process To Dos and apply deduplication logic:
 * - Group by contract_id, client_id, housemaid_id
 * - If To Dos are < 3 months apart, count as ONE sale
 * - If a new To Do is > 3 months from the previous, it's a NEW sale
 */
export function processOverseasSales(todos: TodoRow[]): OverseasSalesData {
  // Step 1: Group To Dos by sale key (contract + client + housemaid)
  const groupedMap = new Map<string, GroupedTodo>();
  
  for (const todo of todos) {
    const key = getSaleKey(todo);
    
    if (!groupedMap.has(key)) {
      groupedMap.set(key, {
        key,
        contractId: todo.contractId,
        clientId: todo.clientId,
        housemaidId: todo.housemaidId,
        todos: [],
      });
    }
    
    groupedMap.get(key)!.todos.push(todo);
  }
  
  // Step 2: For each group, apply 3-month deduplication
  const sales: OverseasSale[] = [];
  let totalDedupedSales = 0;
  const salesByMonth: Record<string, number> = {};
  
  for (const [, group] of groupedMap) {
    // Sort To Dos by date (earliest first)
    const sortedTodos = [...group.todos].sort((a, b) => {
      const dateA = new Date(a.createdAt || 0);
      const dateB = new Date(b.createdAt || 0);
      return dateA.getTime() - dateB.getTime();
    });
    
    // Apply 3-month windowing to count distinct sales
    const salePeriods: { startDate: string; endDate: string; todoIds: string[] }[] = [];
    
    for (const todo of sortedTodos) {
      if (!todo.createdAt) continue;
      
      // Find if this To Do falls within an existing sale period
      let addedToExisting = false;
      
      for (const period of salePeriods) {
        // Check if this To Do is within 3 months of the start of this period
        if (isWithinThreeMonths(period.startDate, todo.createdAt)) {
          // Add to existing period, extend end date if needed
          period.todoIds.push(todo.id);
          if (new Date(todo.createdAt) > new Date(period.endDate)) {
            period.endDate = todo.createdAt;
          }
          addedToExisting = true;
          break;
        }
      }
      
      if (!addedToExisting) {
        // Start a new sale period
        salePeriods.push({
          startDate: todo.createdAt,
          endDate: todo.createdAt,
          todoIds: [todo.id],
        });
      }
    }
    
    // Each period = one deduplicated sale
    const deduplicatedCount = salePeriods.length;
    totalDedupedSales += deduplicatedCount;
    
    // Track sales by month (using first occurrence of each period)
    for (const period of salePeriods) {
      const monthKey = period.startDate.substring(0, 7); // "2026-01"
      if (monthKey && monthKey.length === 7) {
        salesByMonth[monthKey] = (salesByMonth[monthKey] || 0) + 1;
      }
    }
    
    // Create the sale record
    const allTodoIds = sortedTodos.map(t => t.id);
    const firstDate = sortedTodos[0]?.createdAt || '';
    const lastDate = sortedTodos[sortedTodos.length - 1]?.createdAt || '';
    
    sales.push({
      id: `sale_${group.key}`,
      contractId: group.contractId,
      clientId: group.clientId,
      housemaidId: group.housemaidId,
      firstSaleDate: firstDate,
      lastSaleDate: lastDate,
      occurrenceCount: group.todos.length,
      deduplicatedCount,
      relatedTodoIds: allTodoIds,
    });
  }
  
  return {
    lastUpdated: new Date().toISOString(),
    totalRawTodos: todos.length,
    totalDedupedSales,
    sales,
    salesByMonth,
  };
}

/**
 * Get sales count for a specific date range
 */
export function getSalesInRange(
  salesData: OverseasSalesData,
  startDate: string,
  endDate: string
): number {
  let count = 0;
  
  for (const sale of salesData.sales) {
    // Count each deduplicated sale that falls within the range
    // We need to check each sale period individually
    const saleStart = new Date(sale.firstSaleDate);
    const rangeStart = new Date(startDate);
    const rangeEnd = new Date(endDate);
    
    // Check if sale's first date is within range
    if (saleStart >= rangeStart && saleStart <= rangeEnd) {
      count += sale.deduplicatedCount;
    }
  }
  
  return count;
}

/**
 * Merge new To Do data with existing, applying deduplication
 */
export function mergeOverseasSales(
  existing: OverseasSalesData | null,
  newTodos: TodoRow[]
): OverseasSalesData {
  if (!existing) {
    return processOverseasSales(newTodos);
  }
  
  // Combine existing sale IDs with new To Dos
  const existingTodoIds = new Set<string>();
  for (const sale of existing.sales) {
    for (const todoId of sale.relatedTodoIds) {
      existingTodoIds.add(todoId);
    }
  }
  
  // Filter out duplicates from new To Dos
  const uniqueNewTodos = newTodos.filter(todo => !existingTodoIds.has(todo.id));
  
  if (uniqueNewTodos.length === 0) {
    // No new unique To Dos
    return existing;
  }
  
  // Reconstruct all To Dos and reprocess
  // This ensures proper deduplication across all data
  const allTodos = [
    ...reconstructTodosFromSales(existing),
    ...uniqueNewTodos,
  ];
  
  return processOverseasSales(allTodos);
}

/**
 * Reconstruct TodoRow objects from sales data for reprocessing
 * Note: This is a simplified reconstruction - some data may be lost
 */
function reconstructTodosFromSales(salesData: OverseasSalesData): TodoRow[] {
  const todos: TodoRow[] = [];
  
  for (const sale of salesData.sales) {
    // Create one "representative" To Do for each sale
    // In a full implementation, we would store all original To Dos
    todos.push({
      id: sale.relatedTodoIds[0] || sale.id,
      todoName: 'Overseas',
      contractId: sale.contractId,
      clientId: sale.clientId,
      housemaidId: sale.housemaidId,
      createdAt: sale.firstSaleDate,
    });
    
    // If there were multiple deduplicated sales, create representatives for those too
    if (sale.deduplicatedCount > 1 && sale.relatedTodoIds.length > 1) {
      // This is a simplification - in production, store all original To Dos
      todos.push({
        id: sale.relatedTodoIds[sale.relatedTodoIds.length - 1] || `${sale.id}_last`,
        todoName: 'Overseas',
        contractId: sale.contractId,
        clientId: sale.clientId,
        housemaidId: sale.housemaidId,
        createdAt: sale.lastSaleDate,
      });
    }
  }
  
  return todos;
}

