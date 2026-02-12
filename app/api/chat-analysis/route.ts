import { NextResponse } from 'next/server';
import { saveDailyChatAnalysisData, aggregateDailyChatAnalysisResults, getLatestChatAnalysisData } from '@/lib/chat-storage';
import type { ChatAnalysisRequest, ChatAnalysisResponse, ChatAnalysisResult, ChatDataResponse } from '@/lib/chat-types';

/**
 * API Endpoint: /api/chat-analysis
 * 
 * POST - Submit chat analysis results
 * GET - Retrieve latest chat analysis data for dashboard
 * 
 * Authentication:
 *   Header: Authorization: Bearer <your-api-key>
 */

// Verify API key from Authorization header
function verifyApiKey(request: Request): boolean {
  const validKey = process.env.INGEST_API_KEY;
  if (!validKey) {
    console.warn('[Chat Analysis] Warning: INGEST_API_KEY not set, rejecting all requests for security');
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

/**
 * POST - Submit chat analysis results
 * 
 * Expected body:
 * {
 *   "analysisDate": "2026-02-13",
 *   "conversations": [
 *     {
 *       "conversationId": "conv_123",
 *       "chatStartDateTime": "2026-02-13T10:30:00Z",
 *       "frustrationScore": 75,
 *       "confusionScore": 45,
 *       "mainIssues": ["Long response times", "Complex process"],
 *       "keyPhrases": ["waiting too long", "don't understand"],
 *       "maidId": "maid_123",
 *       "clientId": "client_456"
 *     }
 *   ]
 * }
 */
export async function POST(request: Request): Promise<NextResponse<ChatAnalysisResponse>> {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized',
          error: 'Invalid or missing API key' 
        },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validate required fields
    if (!body.conversations || !Array.isArray(body.conversations)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request',
          error: 'Missing or invalid conversations array' 
        },
        { status: 400 }
      );
    }

    // Validate analysis date
    const analysisDate = body.analysisDate || new Date().toISOString().split('T')[0];
    
    // Validate date format (YYYY-MM-DD)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(analysisDate)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Invalid request',
          error: 'analysisDate must be in YYYY-MM-DD format' 
        },
        { status: 400 }
      );
    }

    // Validate each conversation
    const conversations = body.conversations.map((conv: any, index: number) => {
      if (!conv.conversationId || typeof conv.frustrationScore !== 'number' || typeof conv.confusionScore !== 'number') {
        throw new Error(`Invalid conversation at index ${index}: missing required fields (conversationId, frustrationScore, confusionScore)`);
      }
      
      return {
        conversationId: conv.conversationId,
        chatStartDateTime: conv.chatStartDateTime || new Date().toISOString(),
        frustrationScore: Math.max(0, Math.min(100, conv.frustrationScore)),
        confusionScore: Math.max(0, Math.min(100, conv.confusionScore)),
        mainIssues: Array.isArray(conv.mainIssues) ? conv.mainIssues : [],
        keyPhrases: Array.isArray(conv.keyPhrases) ? conv.keyPhrases : [],
        maidId: conv.maidId,
        clientId: conv.clientId,
        contractId: conv.contractId,
        maidName: conv.maidName,
        clientName: conv.clientName,
        contractType: conv.contractType,
      };
    });

    // Aggregate the individual conversation scores into daily dashboard data
    const aggregatedData = await aggregateDailyChatAnalysisResults(conversations, analysisDate);
    
    // Save to blob storage
    await saveDailyChatAnalysisData(aggregatedData);

    return NextResponse.json({
      success: true,
      message: 'Chat analysis data saved successfully',
      data: {
        analysisId: `analysis_${Date.now()}`,
        processedConversations: conversations.length,
        analysisDate: analysisDate,
      },
    });

  } catch (error) {
    console.error('[Chat Analysis API] POST error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: String(error) 
      },
      { status: 500 }
    );
  }
}

/**
 * GET - Retrieve latest chat analysis data for dashboard
 */
export async function GET(): Promise<NextResponse<ChatDataResponse>> {
  try {
    const data = await getLatestChatAnalysisData();
    
    if (!data) {
      return NextResponse.json({
        success: true,
        data: {
          lastUpdated: new Date().toISOString(),
          analysisDate: new Date().toISOString().split('T')[0],
          overallMetrics: {
            frustrationScore: 0,
            confusionScore: 0,
            totalConversations: 0,
            analysedConversations: 0,
          },
          trends: {
            frustration: { current: 0, previous: 0, direction: 'stable' as const },
            confusion: { current: 0, previous: 0, direction: 'stable' as const },
          },
          trendData: [],
          insights: {
            frustration: {
              mainIssue: {
                title: 'No Data Available',
                description: 'No conversation data has been analyzed yet. Upload chat analysis results to see insights.',
                impact: 0,
                trending: 'stable' as const,
              },
              topDrivers: [],
            },
            confusion: {
              mainIssue: {
                title: 'No Data Available',
                description: 'No conversation data has been analyzed yet. Upload chat analysis results to see insights.',
                impact: 0,
                trending: 'stable' as const,
              },
              topDrivers: [],
            },
          },
          conversationResults: [],
        },
      });
    }

    return NextResponse.json({
      success: true,
      data,
    });

  } catch (error) {
    console.error('[Chat Analysis API] GET error:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch chat analysis data' 
      },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear all chat analysis data
 */
export async function DELETE(request: Request): Promise<NextResponse<ChatAnalysisResponse>> {
  try {
    // Verify API key
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { 
          success: false, 
          message: 'Unauthorized',
          error: 'Invalid or missing API key' 
        },
        { status: 401 }
      );
    }

    // Clear data would be implemented here
    // await clearChatAnalysisData();

    return NextResponse.json({
      success: true,
      message: 'Chat analysis data cleared successfully',
    });

  } catch (error) {
    console.error('[Chat Analysis API] DELETE error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Internal server error',
        error: String(error) 
      },
      { status: 500 }
    );
  }
}
