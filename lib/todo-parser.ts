import Papa from 'papaparse';
import fs from 'fs';
import type { TodoRow } from './todo-types';

// Expected column names in To Do CSV (flexible matching)
const COLUMN_MAPPINGS = {
  id: ['id', 'todo_id', 'todoId', 'ID', 'TODO_ID'],
  todoName: [
    'COMPLAINT_TYPE', 'complaint_type', 'complaintType', 'Complaint Type', 'Complaint_Type',
    'name', 'todo_name', 'todoName', 'NAME', 'TODO_NAME', 'todo name', 'Todo Name',
    'type', 'TYPE', 'Type'
  ],
  contractId: ['CONTRACT_ID', 'contract_id', 'contractId', 'contract id', 'Contract Id', 'Contract ID'],
  clientId: ['CLIENT_ID', 'client_id', 'clientId', 'client id', 'Client Id', 'Client ID'],
  housemaidId: ['HOUSEMAID_ID', 'housemaid_id', 'housemaidId', 'MAID_ID', 'maid_id', 'maidId', 'housemaid id', 'Housemaid Id', 'Maid Id'],
  createdAt: ['CREATION_DATE', 'creation_date', 'creationDate', 'created_at', 'createdAt', 'CREATED_AT', 'date', 'DATE', 'created', 'Created', 'created at', 'Created At'],
  completedAt: ['completed_at', 'completedAt', 'COMPLETED_AT', 'completed', 'Completed', 'completed at', 'Completed At'],
  status: ['status', 'STATUS', 'Status'],
};

function findColumnValue(row: Record<string, string>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    if (row[name] !== undefined && row[name] !== null) {
      return row[name];
    }
  }
  return '';
}

function extractTodoRow(row: Record<string, string>, index: number): TodoRow {
  return {
    id: findColumnValue(row, COLUMN_MAPPINGS.id) || `todo_${index}`,
    todoName: findColumnValue(row, COLUMN_MAPPINGS.todoName),
    contractId: findColumnValue(row, COLUMN_MAPPINGS.contractId),
    clientId: findColumnValue(row, COLUMN_MAPPINGS.clientId),
    housemaidId: findColumnValue(row, COLUMN_MAPPINGS.housemaidId),
    createdAt: findColumnValue(row, COLUMN_MAPPINGS.createdAt),
    completedAt: findColumnValue(row, COLUMN_MAPPINGS.completedAt),
    status: findColumnValue(row, COLUMN_MAPPINGS.status),
  };
}

/**
 * Check if a To-Do represents an Overseas Employment Certificate (OEC) sale
 * Matches: "Overseas Employment Certificate", "Overseas", "OEC"
 */
function isOverseasSale(todoName: string): boolean {
  const name = todoName.toLowerCase().trim();
  return name === 'overseas employment certificate' || 
         name.includes('overseas employment') ||
         name === 'overseas' || 
         name === 'oec';
}

export async function parseTodoCSV(filePath: string): Promise<TodoRow[]> {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: TodoRow[] = (results.data as Record<string, string>[]).map((row, index) => 
          extractTodoRow(row, index)
        );
        
        // Filter to only "Overseas Employment Certificate" To Dos
        const overseasTodos = rows.filter(row => isOverseasSale(row.todoName));
        
        resolve(overseasTodos);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

export async function parseTodoCSVContent(content: string): Promise<TodoRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: TodoRow[] = (results.data as Record<string, string>[]).map((row, index) => 
          extractTodoRow(row, index)
        );
        
        // Filter to only "Overseas Employment Certificate" To Dos
        const overseasTodos = rows.filter(row => isOverseasSale(row.todoName));
        
        resolve(overseasTodos);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

// Parse all To Dos from CSV content (without filtering)
export async function parseAllTodosCSVContent(content: string): Promise<TodoRow[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: TodoRow[] = (results.data as Record<string, string>[]).map((row, index) => 
          extractTodoRow(row, index)
        );
        
        resolve(rows);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}
