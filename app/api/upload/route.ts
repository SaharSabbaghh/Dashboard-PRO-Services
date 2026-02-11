import { NextResponse } from 'next/server';
import Papa from 'papaparse';
import { getOrCreateDailyData, saveDailyData, getTodayDate } from '@/lib/unified-storage';

// Old format columns
interface OldCSVRow {
  Id: string;
  'Conversation Id': string;
  'chat start date time (Asia/Dubai)': string;
  'chat close date time (Asia/Dubai)'?: string;
  'Last Skill'?: string;
  'Last Agent'?: string;
  'Maid Id'?: string;
  'Client Id'?: string;
  Messages: string;
  'Expat/UAE'?: string;
}

// New format columns
interface NewCSVRow {
  CONTRACT_TYPE?: string;
  CONTRACT_ID?: string;
  MAID_ID?: string;
  CLIENT_ID?: string;
  MAID_NAME?: string;
  CLIENT_NAME?: string;
  MERGED_MESSAGES: string;
  FIRST_MESSAGE_TIME: string;
  LAST_MESSAGE_TIME?: string;
  MESSAGE_SKILL?: string;
  CONVERSATION_ID: string;
  MAID_DISPLAY_ID?: string;
}

type CSVRow = OldCSVRow | NewCSVRow;

function isNewFormat(row: CSVRow): row is NewCSVRow {
  return 'CONVERSATION_ID' in row || 'MERGED_MESSAGES' in row;
}

function parseDate(dateStr: string): string {
  // Format: "2026-01-26 1:57:53" or "2026-01-26 06:02:17.000" -> ISO string
  if (!dateStr) return new Date().toISOString();
  
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart) return new Date().toISOString();
  
  const [year, month, day] = datePart.split('-').map(Number);
  // Handle time with optional milliseconds
  const timeClean = (timePart || '0:0:0').split('.')[0];
  const [hour, minute, second] = timeClean.split(':').map(Number);
  
  return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).toISOString();
}

interface ExtractedRowData {
  id: string;
  conversationId: string;
  chatStartDateTime: string;
  lastMessageTime: string;
  maidId: string;
  clientId: string;
  contractId: string;
  maidName: string;
  clientName: string;
  contractType: string; // "CC", "MV", or ""
  messages: string;
  entityKey: string; // The unique key for merging (CLIENT_ID or MAID_ID)
  entityType: 'client' | 'maid' | 'unknown';
}

function extractRowData(row: CSVRow): ExtractedRowData {
  if (isNewFormat(row)) {
    // New format - determine entity key based on CLIENT_ID or MAID_ID
    const clientId = row.CLIENT_ID || '';
    const maidId = row.MAID_ID || '';
    const contractId = row.CONTRACT_ID || '';
    const maidName = row.MAID_NAME || '';
    const clientName = row.CLIENT_NAME || '';
    const contractType = row.CONTRACT_TYPE || ''; // "CC", "MV", or ""
    
    // Determine entity type and key for merging
    let entityKey = '';
    let entityType: 'client' | 'maid' | 'unknown' = 'unknown';
    
    if (clientId) {
      entityKey = `client_${clientId}`;
      entityType = 'client';
    } else if (maidId) {
      entityKey = `maid_${maidId}`;
      entityType = 'maid';
    } else {
      // Fallback to conversation ID if neither is present
      entityKey = row.CONVERSATION_ID || '';
    }
    
    return {
      id: row.CONVERSATION_ID || '',
      conversationId: row.CONVERSATION_ID || '',
      chatStartDateTime: row.FIRST_MESSAGE_TIME || '',
      lastMessageTime: row.LAST_MESSAGE_TIME || '',
      maidId,
      clientId,
      contractId,
      maidName,
      clientName,
      contractType,
      messages: row.MERGED_MESSAGES || '',
      entityKey,
      entityType,
    };
  } else {
    // Old format - use conversation ID as entity key (no merging)
    return {
      id: row.Id || '',
      conversationId: row['Conversation Id'] || '',
      chatStartDateTime: row['chat start date time (Asia/Dubai)'] || '',
      lastMessageTime: '',
      maidId: row['Maid Id'] || '',
      clientId: row['Client Id'] || '',
      contractId: '', // Old format doesn't have contract ID
      maidName: '', // Old format doesn't have maid name
      clientName: '', // Old format doesn't have client name
      contractType: '', // Old format doesn't have contract type
      messages: row.Messages || '',
      entityKey: row.Id || '',
      entityType: 'unknown',
    };
  }
}

interface MergedEntity {
  entityKey: string;
  entityType: 'client' | 'maid' | 'unknown';
  conversationIds: string[];
  firstMessageTime: string;
  lastMessageTime: string;
  maidId: string;
  clientId: string;
  contractId: string;
  maidName: string;
  clientName: string;
  contractType: string;
  messages: string[];
}

function mergeRowsByEntity(rows: ExtractedRowData[]): MergedEntity[] {
  const entityMap = new Map<string, MergedEntity>();
  
  for (const row of rows) {
    if (!row.entityKey || !row.messages) continue;
    
    const existing = entityMap.get(row.entityKey);
    
    if (existing) {
      // Merge into existing entity
      existing.conversationIds.push(row.conversationId);
      existing.messages.push(row.messages);
      
      // Update time range
      if (row.chatStartDateTime < existing.firstMessageTime) {
        existing.firstMessageTime = row.chatStartDateTime;
      }
      if (row.lastMessageTime > existing.lastMessageTime) {
        existing.lastMessageTime = row.lastMessageTime;
      }
      // Keep the first non-empty values encountered
      if (!existing.contractType && row.contractType) {
        existing.contractType = row.contractType;
      }
      if (!existing.contractId && row.contractId) {
        existing.contractId = row.contractId;
      }
      if (!existing.maidName && row.maidName) {
        existing.maidName = row.maidName;
      }
      if (!existing.clientName && row.clientName) {
        existing.clientName = row.clientName;
      }
    } else {
      // Create new entity
      entityMap.set(row.entityKey, {
        entityKey: row.entityKey,
        entityType: row.entityType,
        conversationIds: [row.conversationId],
        firstMessageTime: row.chatStartDateTime,
        lastMessageTime: row.lastMessageTime || row.chatStartDateTime,
        maidId: row.maidId,
        clientId: row.clientId,
        contractId: row.contractId,
        maidName: row.maidName,
        clientName: row.clientName,
        contractType: row.contractType,
        messages: [row.messages],
      });
    }
  }
  
  return Array.from(entityMap.values());
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const reportDateStr = formData.get('reportDate') as string | null;
    
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }
    
    if (!file.name.endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV' },
        { status: 400 }
      );
    }
    
    console.log(`[Upload] Starting upload: ${file.name}`);
    
    // Determine the date for this report
    const reportDate = reportDateStr || getTodayDate();
    
    // Read and parse CSV
    const content = await file.text();
    const parsed = Papa.parse<CSVRow>(content, {
      header: true,
      skipEmptyLines: true,
    });
    
    // Extract data from all rows
    const extractedRows = parsed.data
      .map(row => extractRowData(row))
      .filter(data => data.messages); // Must have messages
    
    console.log(`[Upload] Extracted ${extractedRows.length} rows with messages from ${parsed.data.length} total`);
    
    // Merge rows by entity (CLIENT_ID or MAID_ID)
    const mergedEntities = mergeRowsByEntity(extractedRows);
    console.log(`[Upload] Merged into ${mergedEntities.length} unique entities`);
    
    // Get or create daily data for this date
    const dailyData = await getOrCreateDailyData(reportDate, file.name);
    
    // Create a map of existing results for merging (not just skipping)
    const existingResultsMap = new Map<string, number>();
    dailyData.results.forEach((r, index) => {
      existingResultsMap.set(r.id, index);
    });
    
    // Convert merged entities to conversations (not yet analyzed)
    let newCount = 0;
    let mergedWithExistingCount = 0;
    let mergedConversations = 0;
    
    // Store merged conversations for processing
    for (const entity of mergedEntities) {
      // Merge all messages from this upload
      const newMessages = entity.messages.join('\n\n--- Next Conversation ---\n\n');
      mergedConversations += entity.conversationIds.length > 1 ? entity.conversationIds.length - 1 : 0;
      
      const existingIndex = existingResultsMap.get(entity.entityKey);
      
      if (existingIndex !== undefined) {
        // MERGE with existing result (instead of skipping)
        const existing = dailyData.results[existingIndex];
        
        // Append new messages to existing
        existing.messages = existing.messages 
          ? existing.messages + '\n\n--- Next Conversation ---\n\n' + newMessages
          : newMessages;
        
        // Append conversation IDs (keep unique only)
        const existingConvIds = new Set(existing.conversationId ? existing.conversationId.split(',') : []);
        const newConvIds = entity.conversationIds.filter(Boolean);
        for (const id of newConvIds) {
          existingConvIds.add(id);
        }
        existing.conversationId = Array.from(existingConvIds).filter(Boolean).join(',');
        
        // Fill in missing fields
        if (!existing.contractId && entity.contractId) existing.contractId = entity.contractId;
        if (!existing.maidName && entity.maidName) existing.maidName = entity.maidName;
        if (!existing.clientName && entity.clientName) existing.clientName = entity.clientName;
        if (!existing.contractType && entity.contractType) existing.contractType = entity.contractType;
        
        // Keep earliest time
        const newTime = parseDate(entity.firstMessageTime);
        if (newTime && newTime < existing.chatStartDateTime) {
          existing.chatStartDateTime = newTime;
        }
        
        mergedWithExistingCount++;
      } else {
        // CREATE new result
        const uniqueConvIds = [...new Set(entity.conversationIds.filter(Boolean))];
        dailyData.results.push({
          id: entity.entityKey, // Use entity key as unique ID
          conversationId: uniqueConvIds.join(','), // Store unique conversation IDs only
          chatStartDateTime: parseDate(entity.firstMessageTime),
          maidId: entity.maidId,
          clientId: entity.clientId,
          contractId: entity.contractId, // For household grouping
          maidName: entity.maidName,
          clientName: entity.clientName,
          contractType: entity.contractType, // "CC", "MV", or ""
          messages: newMessages, // Store the merged conversation text
          isOECProspect: false,
          isOWWAProspect: false,
          isTravelVisaProspect: false,
          travelVisaCountries: [],
          processedAt: '', // Empty means not yet analyzed
        });
        
        newCount++;
      }
    }
    
    // Update counts
    dailyData.totalConversations = dailyData.results.length;
    dailyData.processedCount = dailyData.results.filter(r => r.processedAt).length;
    dailyData.fileName = file.name;
    
    // Save the daily data
    await saveDailyData(reportDate, dailyData);
    
    console.log(`[Upload] Complete: ${newCount} new entities, ${mergedWithExistingCount} merged with existing, ${mergedConversations} conversations merged within file`);
    
    return NextResponse.json({
      success: true,
      message: 'Upload successful',
      fileName: file.name,
      date: reportDate,
      totalRows: extractedRows.length,
      uniqueEntities: mergedEntities.length,
      newEntities: newCount,
      mergedWithExisting: mergedWithExistingCount,
      conversationsMerged: mergedConversations,
      totalConversations: dailyData.totalConversations,
      pendingAnalysis: dailyData.totalConversations - dailyData.processedCount,
    });
    
  } catch (error) {
    console.error('[Upload] Error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file', details: String(error) },
      { status: 500 }
    );
  }
}

