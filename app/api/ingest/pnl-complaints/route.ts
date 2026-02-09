import { NextResponse } from 'next/server';
import { 
  processAndSavePnLComplaints, 
  clearComplaintsByDateRange,
  getPnLComplaintsData,
  getPnLComplaintsSummary,
} from '@/lib/pnl-complaints-processor';
import type { PnLComplaint } from '@/lib/pnl-complaints-types';
import { ALL_SERVICE_KEYS, SERVICE_NAMES } from '@/lib/pnl-complaints-types';

/**
 * API Endpoint: /api/ingest/pnl-complaints
 * 
 * Receives daily complaint data for P&L tracking.
 * Each import REPLACES all existing data.
 * 
 * Authentication:
 *   Header: Authorization: Bearer <your-api-key>
 * 
 * POST - Ingest complaints:
 * {
 *   "complaints": [
 *     {
 *       "contractId": "1086364",
 *       "housemaidId": "12345",
 *       "clientId": "67890",
 *       "complaintType": "Overseas Employment Certificate",
 *       "creationDate": "2026-01-29 21:00:35.000"
 *     },
 *     ...
 *   ]
 * }
 * 
 * DELETE - Clear data by date range:
 *   Query params: ?startDate=2026-01-01&endDate=2026-01-31
 * 
 * GET - API info/status
 */

// Verify API key from Authorization header
function verifyApiKey(request: Request): boolean {
  const validKey = process.env.INGEST_API_KEY;
  if (!validKey) {
    console.warn('[P&L Ingest] Warning: INGEST_API_KEY not set, rejecting all requests for security');
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

interface IngestComplaintRaw {
  CONTRACT_ID?: string;
  HOUSEMAID_ID?: string;
  CLIENT_ID?: string;
  COMPLAINT_TYPE?: string;
  CREATION_DATE?: string;
  // Alternative camelCase format
  contractId?: string;
  housemaidId?: string;
  clientId?: string;
  complaintType?: string;
  creationDate?: string;
}

interface IngestRequest {
  complaints: IngestComplaintRaw[];
}

// Normalize complaint from either CSV format or camelCase format
function normalizeComplaint(raw: IngestComplaintRaw): PnLComplaint {
  return {
    contractId: raw.CONTRACT_ID || raw.contractId || '',
    housemaidId: raw.HOUSEMAID_ID || raw.housemaidId || '',
    clientId: raw.CLIENT_ID || raw.clientId || '',
    complaintType: raw.COMPLAINT_TYPE || raw.complaintType || '',
    creationDate: raw.CREATION_DATE || raw.creationDate || '',
  };
}

/**
 * POST - Receive and process daily complaints
 * Completely replaces existing data
 */
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
    if (!body.complaints || !Array.isArray(body.complaints)) {
      return NextResponse.json(
        { error: 'Missing or invalid complaints array' },
        { status: 400 }
      );
    }
    
    const totalReceived = body.complaints.length;
    console.log(`[P&L Ingest] Processing ${totalReceived} complaints`);
    
    // Normalize complaints
    const complaints = body.complaints.map(normalizeComplaint);
    
    // Process and save (replaces all existing data)
    const result = processAndSavePnLComplaints(complaints);
    
    console.log(`[P&L Ingest] Complete: ${result.summary.totalUniqueSales} unique sales from ${totalReceived} complaints`);
    
    // Build response with service breakdown
    const serviceBreakdown: Record<string, { uniqueSales: number; totalComplaints: number }> = {};
    for (const key of ALL_SERVICE_KEYS) {
      const service = result.services[key];
      if (service.uniqueSales > 0 || service.totalComplaints > 0) {
        serviceBreakdown[key] = {
          uniqueSales: service.uniqueSales,
          totalComplaints: service.totalComplaints,
        };
      }
    }
    
    return NextResponse.json({
      success: true,
      totalReceived,
      totalProcessed: result.rawComplaintsCount,
      summary: {
        totalUniqueSales: result.summary.totalUniqueSales,
        totalUniqueClients: result.summary.totalUniqueClients,
        totalUniqueContracts: result.summary.totalUniqueContracts,
      },
      serviceBreakdown,
      lastUpdated: result.lastUpdated,
    });
    
  } catch (error) {
    console.error('[P&L Ingest] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process complaints data', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * DELETE - Clear data by date range
 */
export async function DELETE(request: Request) {
  try {
    // Validate API key from Authorization header
    if (!verifyApiKey(request)) {
      return NextResponse.json(
        { error: 'Unauthorized. Provide valid API key in Authorization header.' },
        { status: 401 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    
    if (!startDate && !endDate) {
      return NextResponse.json(
        { error: 'At least one of startDate or endDate query parameter is required' },
        { status: 400 }
      );
    }
    
    console.log(`[P&L Ingest] Clearing data from ${startDate || 'beginning'} to ${endDate || 'end'}`);
    
    // Get current state before clearing
    const before = getPnLComplaintsSummary();
    
    // Clear and reprocess
    const result = clearComplaintsByDateRange(startDate, endDate);
    
    console.log(`[P&L Ingest] Cleared: ${before.totalSales - result.summary.totalUniqueSales} sales removed`);
    
    return NextResponse.json({
      success: true,
      clearedRange: {
        startDate: startDate || 'beginning',
        endDate: endDate || 'end',
      },
      before: {
        totalSales: before.totalSales,
        totalComplaints: before.totalComplaints,
      },
      after: {
        totalSales: result.summary.totalUniqueSales,
        totalComplaints: result.rawComplaintsCount,
      },
      removed: {
        sales: before.totalSales - result.summary.totalUniqueSales,
        complaints: before.totalComplaints - result.rawComplaintsCount,
      },
    });
    
  } catch (error) {
    console.error('[P&L Ingest] Error clearing data:', error);
    return NextResponse.json(
      { error: 'Failed to clear data', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET - API info and current status
 */
export async function GET() {
  const data = getPnLComplaintsData();
  
  const status = data ? {
    hasData: true,
    lastUpdated: data.lastUpdated,
    totalComplaints: data.rawComplaintsCount,
    totalUniqueSales: data.summary.totalUniqueSales,
    services: Object.fromEntries(
      ALL_SERVICE_KEYS.map(key => [key, {
        name: SERVICE_NAMES[key],
        uniqueSales: data.services[key].uniqueSales,
      }])
    ),
  } : {
    hasData: false,
    lastUpdated: null,
    totalComplaints: 0,
    totalUniqueSales: 0,
    services: {},
  };
  
  return NextResponse.json({
    endpoint: '/api/ingest/pnl-complaints',
    methods: {
      POST: {
        description: 'Ingest complaints data for P&L tracking (replaces all existing data)',
        authentication: 'Bearer token in Authorization header',
        body: {
          complaints: [
            {
              contractId: 'string (or CONTRACT_ID)',
              housemaidId: 'string (or HOUSEMAID_ID)',
              clientId: 'string (or CLIENT_ID)',
              complaintType: 'string (or COMPLAINT_TYPE)',
              creationDate: 'string (or CREATION_DATE)',
            }
          ],
        },
      },
      DELETE: {
        description: 'Clear data by date range',
        authentication: 'Bearer token in Authorization header',
        queryParams: {
          startDate: 'YYYY-MM-DD (optional)',
          endDate: 'YYYY-MM-DD (optional)',
        },
      },
    },
    supportedComplaintTypes: Object.fromEntries(
      ALL_SERVICE_KEYS.map(key => [key, SERVICE_NAMES[key]])
    ),
    deduplicationLogic: 'Same CONTRACT_ID + CLIENT_ID + HOUSEMAID_ID + complaint type within 3 months = 1 sale',
    currentStatus: status,
  });
}

