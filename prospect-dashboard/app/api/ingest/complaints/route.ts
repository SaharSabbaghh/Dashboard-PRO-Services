import { NextResponse } from 'next/server';
import { processTodosAndSave, reprocessAllOverseasSales } from '@/lib/unified-storage';
import type { TodoRow } from '@/lib/todo-types';

/**
 * API Endpoint: POST /api/ingest/complaints
 * 
 * Receives complaints/To-Do data for OEC sales tracking.
 * Filters for "Overseas Employment Certificate" complaint types.
 * 
 * Authentication:
 *   Header: Authorization: Bearer <your-api-key>
 * 
 * Request Body:
 * {
 *   "replaceAll": false,  // Optional: if true, replaces all existing data
 *   "complaints": [
 *     {
 *       "id": "todo_123",  // Optional
 *       "contractId": "1086364",
 *       "clientId": "67890",
 *       "housemaidId": "12345",
 *       "complaintType": "Overseas Employment Certificate",
 *       "creationDate": "2026-01-29 21:00:35"
 *     },
 *     ...
 *   ]
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "totalReceived": 100,
 *   "oecComplaints": 25,
 *   "totalDedupedSales": 20,
 *   "salesByMonth": { "2026-01": 15, "2026-02": 5 }
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

interface IngestComplaint {
  id?: string;
  contractId: string;
  clientId: string;
  housemaidId: string;
  complaintType: string;
  creationDate: string;
  status?: string;
}

interface IngestRequest {
  replaceAll?: boolean;
  complaints: IngestComplaint[];
}

/**
 * Check if a complaint type indicates an OEC sale
 */
function isOECSale(complaintType: string): boolean {
  const type = complaintType.toLowerCase().trim();
  return type === 'overseas employment certificate' || 
         type.includes('overseas employment') ||
         type === 'overseas' || 
         type === 'oec';
}

/**
 * Parse date string to ISO format
 * Handles: "2026-01-29 21:00:35" format
 */
function parseDate(dateStr: string): string {
  if (!dateStr) return new Date().toISOString();
  
  // If already ISO format
  if (dateStr.includes('T')) return dateStr;
  
  // Parse "YYYY-MM-DD HH:MM:SS" format
  const [datePart, timePart] = dateStr.split(' ');
  if (!datePart) return new Date().toISOString();
  
  const [year, month, day] = datePart.split('-').map(Number);
  const timeClean = (timePart || '0:0:0').split('.')[0];
  const [hour, minute, second] = timeClean.split(':').map(Number);
  
  return new Date(year, month - 1, day, hour || 0, minute || 0, second || 0).toISOString();
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
    if (!body.complaints || !Array.isArray(body.complaints)) {
      return NextResponse.json(
        { error: 'Missing or invalid complaints array' },
        { status: 400 }
      );
    }
    
    const totalReceived = body.complaints.length;
    console.log(`[Ingest Complaints] Processing ${totalReceived} complaints`);
    
    // Filter for OEC complaints and convert to TodoRow format
    const oecTodos: TodoRow[] = [];
    
    for (let i = 0; i < body.complaints.length; i++) {
      const complaint = body.complaints[i];
      
      // Filter for OEC sales only
      if (!isOECSale(complaint.complaintType)) {
        continue;
      }
      
      const todo: TodoRow = {
        id: complaint.id || `complaint_${i}_${Date.now()}`,
        todoName: complaint.complaintType,
        contractId: complaint.contractId || '',
        clientId: complaint.clientId || '',
        housemaidId: complaint.housemaidId || '',
        createdAt: parseDate(complaint.creationDate),
        status: complaint.status,
      };
      
      oecTodos.push(todo);
    }
    
    console.log(`[Ingest Complaints] Found ${oecTodos.length} OEC complaints`);
    
    if (oecTodos.length === 0) {
      return NextResponse.json({
        success: true,
        warning: 'No OEC complaints found in the data',
        totalReceived,
        oecComplaints: 0,
        totalDedupedSales: 0,
        salesByMonth: {},
      });
    }
    
    // Process and save with deduplication
    let salesData;
    if (body.replaceAll) {
      // Replace all existing data
      salesData = await reprocessAllOverseasSales(oecTodos);
    } else {
      // Merge with existing data
      salesData = await processTodosAndSave(oecTodos);
    }
    
    console.log(`[Ingest Complaints] Complete: ${salesData.totalDedupedSales} deduplicated sales`);
    
    return NextResponse.json({
      success: true,
      totalReceived,
      oecComplaints: oecTodos.length,
      totalDedupedSales: salesData.totalDedupedSales,
      totalRawEntries: salesData.totalRawTodos,
      salesByMonth: salesData.salesByMonth,
    });
    
  } catch (error) {
    console.error('[Ingest Complaints] Error:', error);
    return NextResponse.json(
      { error: 'Failed to process complaints data', details: String(error) },
      { status: 500 }
    );
  }
}

// GET endpoint to check status
export async function GET() {
  return NextResponse.json({
    endpoint: '/api/ingest/complaints',
    method: 'POST',
    description: 'Ingest complaints/To-Do data for OEC sales tracking',
    authentication: {
      type: 'Bearer token',
      header: 'Authorization: Bearer <your-api-key>',
    },
    requiredFields: ['complaints'],
    optionalFields: ['replaceAll'],
    complaintFields: {
      required: ['contractId', 'clientId', 'housemaidId', 'complaintType', 'creationDate'],
      optional: ['id', 'status']
    },
    oecSaleIndicators: [
      'Overseas Employment Certificate',
      'overseas employment',
      'overseas',
      'oec'
    ],
    deduplicationLogic: 'Same contract+client+housemaid within 3 months = 1 sale. After 3 months = new sale.'
  });
}

