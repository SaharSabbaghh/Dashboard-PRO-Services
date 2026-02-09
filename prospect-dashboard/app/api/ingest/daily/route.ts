import { NextResponse } from 'next/server';
import { getOrCreateDailyData, saveDailyData, getTodayDate } from '@/lib/unified-storage';
import type { ProcessedConversation } from '@/lib/storage';

/**
 * API Endpoint: POST /api/ingest/daily
 * 
 * Receives daily conversation data from external systems.
 * 
 * Authentication:
 *   Header: Authorization: Bearer <your-api-key>
 * 
 * Request Body:
 * {
 *   "date": "2026-02-09",  // Optional, defaults to today
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

interface IngestRequest {
  date?: string;
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
    console.log(`[Ingest Daily] Processing ${body.conversations.length} conversations for ${date}`);
    
    // Get or create daily data
    const dailyData = await getOrCreateDailyData(date);
    
    // Create a set of existing entity keys for deduplication
    const existingKeys = new Set(dailyData.results.map(r => r.id));
    
    let imported = 0;
    let duplicates = 0;
    
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
      
      // Skip if already exists
      if (existingKeys.has(entityKey)) {
        duplicates++;
        continue;
      }
      
      // Merge into entity map
      const existing = entityMap.get(entityKey);
      if (existing) {
        existing.conversations.push(conv);
        // Keep earliest time
        if (conv.chatStartDateTime && conv.chatStartDateTime < existing.firstMessageTime) {
          existing.firstMessageTime = conv.chatStartDateTime;
        }
        // Fill in missing fields
        if (!existing.contractId && conv.contractId) existing.contractId = conv.contractId;
        if (!existing.maidName && conv.maidName) existing.maidName = conv.maidName;
        if (!existing.clientName && conv.clientName) existing.clientName = conv.clientName;
        if (!existing.contractType && conv.contractType) existing.contractType = conv.contractType;
      } else {
        entityMap.set(entityKey, {
          entityKey,
          conversations: [conv],
          maidId: conv.maidId || '',
          clientId: conv.clientId || '',
          contractId: conv.contractId || '',
          maidName: conv.maidName || '',
          clientName: conv.clientName || '',
          contractType: conv.contractType || '',
          firstMessageTime: conv.chatStartDateTime || new Date().toISOString(),
        });
      }
    }
    
    // Convert entity map to results
    for (const [, entity] of entityMap) {
      // Merge all messages
      const mergedMessages = entity.conversations
        .map(c => c.messages)
        .join('\n\n--- Next Conversation ---\n\n');
      
      const result: ProcessedConversation = {
        id: entity.entityKey,
        conversationId: entity.conversations.map(c => c.conversationId).join(','),
        chatStartDateTime: entity.firstMessageTime,
        maidId: entity.maidId,
        clientId: entity.clientId,
        contractId: entity.contractId,
        maidName: entity.maidName,
        clientName: entity.clientName,
        contractType: entity.contractType,
        messages: mergedMessages,
        isOECProspect: false,
        isOWWAProspect: false,
        isTravelVisaProspect: false,
        travelVisaCountries: [],
        processedAt: '', // Not yet analyzed by AI
      };
      
      dailyData.results.push(result);
      imported++;
    }
    
    // Update counts
    dailyData.totalConversations = dailyData.results.length;
    dailyData.processedCount = dailyData.results.filter(r => r.processedAt).length;
    
    // Save
    await saveDailyData(date, dailyData);
    
    console.log(`[Ingest Daily] Complete: ${imported} imported, ${duplicates} duplicates`);
    
    return NextResponse.json({
      success: true,
      date,
      imported,
      duplicates,
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

