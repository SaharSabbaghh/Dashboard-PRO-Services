import Papa from 'papaparse';
import fs from 'fs';
import path from 'path';

export interface ConversationRow {
  id: string;
  conversationId: string;
  chatStartDateTime: string;
  lastSkill: string;
  lastAgent: string;
  maidId: string;
  clientId: string;
  contractId: string;
  maidName: string;
  clientName: string;
  messages: string;
  expatUAE: string;
}

function isNewFormat(row: Record<string, string>): boolean {
  return 'CONVERSATION_ID' in row || 'MERGED_MESSAGES' in row;
}

function extractRowData(row: Record<string, string>): ConversationRow {
  if (isNewFormat(row)) {
    // New format
    return {
      id: row['CONVERSATION_ID'] || '',
      conversationId: row['CONVERSATION_ID'] || '',
      chatStartDateTime: row['FIRST_MESSAGE_TIME'] || '',
      lastSkill: row['MESSAGE_SKILL'] || '',
      lastAgent: '', // Not available in new format
      maidId: row['MAID_ID'] || '',
      clientId: row['CLIENT_ID'] || '',
      contractId: row['CONTRACT_ID'] || '',
      maidName: row['MAID_NAME'] || '',
      clientName: row['CLIENT_NAME'] || '',
      messages: row['MERGED_MESSAGES'] || '',
      expatUAE: '', // Not available in new format
    };
  } else {
    // Old format
    return {
      id: row['Id'] || '',
      conversationId: row['Conversation Id'] || '',
      chatStartDateTime: row['chat start date time (Asia/Dubai)'] || '',
      lastSkill: row['Last Skill'] || '',
      lastAgent: row['Last Agent'] || '',
      maidId: row['Maid Id'] || '',
      clientId: row['Client Id'] || '',
      contractId: '', // Not available in old format
      maidName: '', // Not available in old format
      clientName: '', // Not available in old format
      messages: row['Messages'] || '',
      expatUAE: row['Expat/UAE'] || '',
    };
  }
}

export async function parseCSV(filePath: string): Promise<ConversationRow[]> {
  return new Promise((resolve, reject) => {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    
    Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const rows: ConversationRow[] = (results.data as Record<string, string>[]).map((row) => 
          extractRowData(row)
        );
        
        // Filter out rows without valid IDs or messages
        const validRows = rows.filter(row => row.id && row.messages);
        resolve(validRows);
      },
      error: (error: Error) => {
        reject(error);
      }
    });
  });
}

export function getCSVPath(): string {
  // Look for the CSV in the parent directory
  const csvPath = path.join(process.cwd(), '..', 'Daily Report - Raw Data V2 - Jan 25.csv');
  return csvPath;
}

export async function getConversationCount(): Promise<number> {
  const csvPath = getCSVPath();
  if (!fs.existsSync(csvPath)) {
    return 0;
  }
  
  const rows = await parseCSV(csvPath);
  return rows.length;
}

