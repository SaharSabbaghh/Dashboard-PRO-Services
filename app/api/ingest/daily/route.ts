import { NextResponse } from 'next/server';
import { getOrCreateDailyData, saveDailyData, getTodayDate } from '@/lib/unified-storage';
import type { ProcessedConversation } from '@/lib/storage';
import { normalizeDate, getEarliestDate } from '@/lib/date-utils';

// Force Node.js runtime for blob storage operations
export const runtime = 'nodejs';

/**
 * API Endpoint: POST /api/ingest/daily
 * 
 * Receives daily conversation data from external systems.
 * Supports batched uploads for large datasets.
 * 
 * Authentication:
 *   Header: Authorization: Bearer <your-api-key>
 * 
 * Request Body:
 * {
 *   "date": "2026-02-09",  // Optional, defaults to today
 *   "batchInfo": {          // Optional, for batched uploads
 *     "batchIndex": 0,
 *     "totalBatches": 5,
 *     "isLast": false
 *   },
 *   "conversations": [
 *     {
 *       "conversationId": "CH12345...",
 *       "chatStartDateTime": "2026-02-09T10:30:00.000Z",
 *       "maidId": "12345",
 *       "clientId": "67890",
 *       "contractId": "1086364",
 *       "maidName": "Maria Santos",
 *       "clientName": "John Doe",
 *       "contractType": "CC",  // "CC" or "MV"
 *       "messages": "Conversation text..."
 *     },
 *     ...
 *   ]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "date": "2026-02-09",
 *   "imported": 150,
 *   "duplicates": 5,
 *   "totalConversations": 155
 * }
 */

// Verify API key from Authorization header
function verifyApiKey(request: Request): boolean {
  const validKey = process.env.INGEST_API_KEY;
  if (!validKey) {
    console.warn('[Ingest] Warning: INGEST_API_KEY not set, rejecting all requests for security');
    return false;
  }
  
  const authHeader = request.headers.get('Authorization');
  if (!authHeader) {
    return false;
  }
  
  // Support both "Bearer <token>" and plain "<token>" formats
  const token = authHeader.startsWith('Bearer ') 
    ? authHeader.slice(7) 
    : authHeader;
  
  return token === validKey;
}

interface IngestConversation {
  conversationId: string;
  chatStartDateTime?: string;
  maidId?: string;
  clientId?: string;
  contractId?: string;
  maidName?: string;
  clientName?: string;
  contractType?: string;
  messages: string;
}

interface BatchInfo {
  batchIndex: number;
  totalBatches: number;
  isLast?: boolean;
}

interface IngestRequest {
  date?: string;
  batchInfo?: BatchInfo;
  conversations: IngestConversation[];
}

export async function POST(request: Request) {
  try {
    // Validate API key from Authorization header
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in Authorization header.' },
        { status: 401 }
      );
    }
    
    const body: IngestRequest = await request.json();
    
    // Validate request
    if (!body.conversations || !Array.isArray(body.conversations)) {
      return NextResponse.json(
        { error: 'Missing or invalid conversations array' },
        { status: 400 }
      );
    }
    
    if (body.conversations.length === 0) {
      return NextResponse.json(
        { error: 'Conversations array is empty' },
        { status: 400 }
      );
    }
    
    const date = body.date || getTodayDate();
    const batchInfo = body.batchInfo;
    
    // Log with batch info if present
    if (batchInfo) {
      console.log(`[Ingest Daily] Batch ${batchInfo.batchIndex + 1}/${batchInfo.totalBatches} - ${body.conversations.length} conversations for ${date}`);
    } else {
      console.log(`[Ingest Daily] Processing ${body.conversations.length} conversations for ${date}`);
    }
    
    // Get or create daily data
    const dailyData = await getOrCreateDailyData(date);
    
    // Create a map of existing results for merging (not just skipping)
    const existingResultsMap = new Map<string, number>();
    dailyData.results.forEach((r, index) => {
      existingResultsMap.set(r.id, index);
    });
    
    let imported = 0;
    let merged = 0;
    
    // Group conversations by entity (client or maid)
    const entityMap = new Map<string, {
      entityKey: string;
      conversations: IngestConversation[];
      maidId: string;
      clientId: string;
      contractId: string;
      maidName: string;
      clientName: string;
      contractType: string;
      firstMessageTime: string;
      existingIndex: number | null; // Track if this entity already exists
    }>();
    
    for (const conv of body.conversations) {
      if (!conv.messages) continue;
      
      // Determine entity key
      let entityKey = '';
      if (conv.clientId) {
        entityKey = `client_${conv.clientId}`;
      } else if (conv.maidId) {
        entityKey = `maid_${conv.maidId}`;
      } else {
        entityKey = conv.conversationId || `conv_${Date.now()}_${Math.random()}`;
      }
      
      // Check if already in entity map (from this batch)
      const existingInBatch = entityMap.get(entityKey);
      if (existingInBatch) {
        existingInBatch.conversations.push(conv);
        // Keep earliest time
        const convTime = normalizeDate(conv.chatStartDateTime);
        const existingTime = normalizeDate(existingInBatch.firstMessageTime);
        if (convTime < existingTime) {
          existingInBatch.firstMessageTime = convTime;
        }
        // Fill in missing fields
        if (!existingInBatch.contractId && conv.contractId) existingInBatch.contractId = conv.contractId;
        if (!existingInBatch.maidName && conv.maidName) existingInBatch.maidName = conv.maidName;
        if (!existingInBatch.clientName && conv.clientName) existingInBatch.clientName = conv.clientName;
        if (!existingInBatch.contractType && conv.contractType) existingInBatch.contractType = conv.contractType;
      } else {
        // Check if exists in previous data
        const existingIndex = existingResultsMap.get(entityKey) ?? null;
        
        entityMap.set(entityKey, {
          entityKey,
          conversations: [conv],
          maidId: conv.maidId || '',
          clientId: conv.clientId || '',
          contractId: conv.contractId || '',
          maidName: conv.maidName || '',
          clientName: conv.clientName || '',
          contractType: conv.contractType || '',
          firstMessageTime: normalizeDate(conv.chatStartDateTime),
          existingIndex,
        });
      }
    }
    
    // Convert entity map to results (merge with existing or create new)
    for (const [, entity] of entityMap) {
      // Merge all new messages
      const newMessages = entity.conversations
        .map(c => c.messages)
        .join('\n\n--- Next Conversation ---\n\n');
      
      if (entity.existingIndex !== null) {
        // MERGE with existing result
        const existing = dailyData.results[entity.existingIndex];
        
        // Get existing conversation IDs
        const existingConvIds = new Set(existing.conversationId ? existing.conversationId.split(',').filter(Boolean) : []);
        
        // Only add messages from NEW conversation IDs (skip duplicates)
        const newConversations = entity.conversations.filter(c => 
          c.conversationId && !existingConvIds.has(c.conversationId)
        );
        
        if (newConversations.length > 0) {
          // Append only new messages
          const newMessagesOnly = newConversations.map(c => c.messages).join('\n\n--- Next Conversation ---\n\n');
          existing.messages = existing.messages 
            ? existing.messages + '\n\n--- Next Conversation ---\n\n' + newMessagesOnly
            : newMessagesOnly;
          
          // Add new conversation IDs
          for (const conv of newConversations) {
            if (conv.conversationId) {
              existingConvIds.add(conv.conversationId);
            }
          }
        }
        
        existing.conversationId = Array.from(existingConvIds).filter(Boolean).join(',');
        
        // Fill in missing fields
        if (!existing.contractId && entity.contractId) existing.contractId = entity.contractId;
        if (!existing.maidName && entity.maidName) existing.maidName = entity.maidName;
        if (!existing.clientName && entity.clientName) existing.clientName = entity.clientName;
        if (!existing.contractType && entity.contractType) existing.contractType = entity.contractType;
        
        // Keep earliest time
        const entityTime = normalizeDate(entity.firstMessageTime);
        const existingTime = normalizeDate(existing.chatStartDateTime);
        if (entityTime < existingTime) {
          existing.chatStartDateTime = entityTime;
        }
        
        merged++;
      } else {
        // CREATE new result
        const uniqueConvIds = [...new Set(entity.conversations.map(c => c.conversationId).filter(Boolean))];
        const result: ProcessedConversation = {
          id: entity.entityKey,
          conversationId: uniqueConvIds.join(','),
          chatStartDateTime: entity.firstMessageTime,
          maidId: entity.maidId,
          clientId: entity.clientId,
          contractId: entity.contractId,
          maidName: entity.maidName,
          clientName: entity.clientName,
          contractType: entity.contractType,
          messages: newMessages,
          isOECProspect: false,
          isOWWAProspect: false,
          isTravelVisaProspect: false,
          travelVisaCountries: [],
          processingStatus: 'pending',
          processedAt: '', // Not yet analyzed by AI
          retryCount: 0,
        };
        
        dailyData.results.push(result);
        imported++;
      }
    }
    
    // Update counts
    dailyData.totalConversations = dailyData.results.length;
    dailyData.processedCount = dailyData.results.filter(r => r.processedAt).length;
    
    // Save
    await saveDailyData(date, dailyData);
    
    const isComplete = !batchInfo || batchInfo.isLast;
    
    // For intermediate batches, return minimal response
    if (batchInfo && !batchInfo.isLast) {
      return NextResponse.json({
        success: true,
        batch: {
          batchIndex: batchInfo.batchIndex,
          totalBatches: batchInfo.totalBatches,
          isComplete: false,
        },
        date,
        imported,
        merged,
        message: `Batch ${batchInfo.batchIndex + 1}/${batchInfo.totalBatches} received`,
      });
    }
    
    console.log(`[Ingest Daily] Complete: ${imported} new, ${merged} merged, total: ${dailyData.totalConversations}`);
    
    return NextResponse.json({
      success: true,
      batch: batchInfo ? {
        batchIndex: batchInfo.batchIndex,
        totalBatches: batchInfo.totalBatches,
        isComplete: true,
      } : undefined,
      date,
      imported,
      merged,
      totalConversations: dailyData.totalConversations,
      pendingAnalysis: dailyData.totalConversations - dailyData.processedCount,
    });
    
  } catch (error) {
    console.error('[Ingest Daily] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process daily data', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ingest/daily',
    method: 'POST',
    description: 'Ingest daily conversation data',
    authentication: {
      type: 'Bearer token',
      header: 'Authorization: Bearer <your-api-key>',
    },
    requiredFields: ['conversations'],
    optionalFields: ['date'],
    conversationFields: {
      required: ['conversationId', 'messages'],
      optional: ['chatStartDateTime', 'maidId', 'clientId', 'contractId', 'maidName', 'clientName', 'contractType']
    }
  });
}

